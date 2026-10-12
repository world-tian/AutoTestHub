from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

from bleak import BleakClient, BleakScanner
from bleak.backends.device import BLEDevice
from bleak.exc import BleakDeviceNotFoundError, BleakError


GAP_SERVICE_UUID = "00001800-0000-1000-8000-00805f9b34fb"
DEVICE_NAME_CHAR_UUID = "00002a00-0000-1000-8000-00805f9b34fb"
NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
NUS_RX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
NUS_TX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"


@dataclass(slots=True)
class BleDeviceState:
    address: str
    name: str
    rssi: int
    alias: str | None = None
    is_connected: bool = False
    is_connecting: bool = False
    last_seen_at: datetime | None = None
    last_error: str | None = None


@dataclass(slots=True)
class BleMessage:
    timestamp: datetime
    address: str
    direction: str
    message: str


@dataclass(slots=True)
class _ClientState:
    device: BLEDevice
    client: BleakClient
    rx_buffer: bytes = b""


class BleGateway:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._devices: dict[str, BleDeviceState] = {}
        self._clients: dict[str, _ClientState] = {}
        self._messages: list[BleMessage] = []
        self._scanning = False
        self._last_scan_at: datetime | None = None

    def snapshot(self) -> dict[str, Any]:
        devices = sorted(
            self._devices.values(),
            key=lambda item: (not item.is_connected, not item.is_connecting, -(item.rssi or -127)),
        )
        return {
            "scanning": self._scanning,
            "last_scan_at": self._last_scan_at,
            "devices": devices,
            "messages": self._messages[-300:],
            "connected_addresses": [address for address, state in self._devices.items() if state.is_connected],
        }

    async def scan(self, seconds: float = 6.0, query: str | None = None) -> list[BleDeviceState]:
        async with self._lock:
            self._scanning = True
            try:
                discovered = await BleakScanner.discover(timeout=seconds)
                now = datetime.now()
                query_text = query.strip().lower() if query else ""
                next_devices: dict[str, BleDeviceState] = {
                    address: state
                    for address, state in self._devices.items()
                    if state.is_connected or state.alias is not None
                }
                for device in discovered:
                    name = (device.name or "Unknown").strip() or "Unknown"
                    rssi = int(getattr(device, "rssi", -127) or -127)
                    if query_text and query_text not in name.lower() and query_text not in device.address.lower():
                        continue
                    state = next_devices.get(device.address)
                    if state is None:
                        state = BleDeviceState(address=device.address, name=name, rssi=rssi)
                    else:
                        state.name = name
                        state.rssi = rssi
                    state.last_seen_at = now
                    state.last_error = None
                    state.is_connected = device.address in self._clients and self._clients[device.address].client.is_connected
                    next_devices[device.address] = state

                self._devices = next_devices

                self._last_scan_at = now
                return [
                    state
                    for state in self._devices.values()
                    if not query_text or query_text in state.name.lower() or query_text in state.address.lower()
                ]
            finally:
                self._scanning = False

    async def connect(self, address: str) -> BleDeviceState:
        async with self._lock:
            return await self._connect_inner(address)

    async def disconnect(self, address: str) -> BleDeviceState:
        async with self._lock:
            return await self._disconnect_inner(address)

    async def disconnect_all(self) -> None:
        async with self._lock:
            addresses = list(self._clients)
            for address in addresses:
                await self._disconnect_inner(address)

    async def send(self, message: str, address: str | None = None, append_newline: bool = True, broadcast: bool = False) -> dict[str, Any]:
        payload = message.encode("utf-8")
        if append_newline and not message.endswith("\n"):
            payload += b"\n"

        async with self._lock:
            targets = list(self._clients.items()) if broadcast or address is None else [(address, self._clients.get(address))]
            targets = [(target_address, client_state) for target_address, client_state in targets if client_state is not None and client_state.client.is_connected]
            if not targets:
                raise BleakError("No connected device available")

            sent_to: list[str] = []
            for target_address, client_state in targets:
                chunk_size = max(20, min(244, int(getattr(client_state.client, "mtu_size", 23)) - 3))
                for offset in range(0, len(payload), chunk_size):
                    await client_state.client.write_gatt_char(
                        NUS_RX_UUID,
                        payload[offset : offset + chunk_size],
                        response=False,
                    )
                    await asyncio.sleep(0.005)
                sent_to.append(target_address)
                self._message(target_address, "tx", message)
            return {"sent_to": sent_to, "bytes": len(payload)}

    async def rename(self, address: str, name: str, characteristic_uuid: str | None = None) -> BleDeviceState:
        async with self._lock:
            client_state = self._clients.get(address)
            if client_state is None or not client_state.client.is_connected:
                await self._connect_inner(address)
                client_state = self._clients.get(address)
            if client_state is None:
                raise BleakError("Device is not connected")

            client = client_state.client
            target_uuid = (characteristic_uuid or DEVICE_NAME_CHAR_UUID).lower()
            service = client.services.get_service(GAP_SERVICE_UUID)
            state = self._ensure_state(address)
            if service is not None:
                characteristic = service.get_characteristic(target_uuid)
                if characteristic is not None and (
                    "write" in characteristic.properties or "write-without-response" in characteristic.properties
                ):
                    await client.write_gatt_char(
                        characteristic,
                        name.encode("utf-8"),
                        response="write" in characteristic.properties,
                    )
                    state.name = name
                    state.alias = None
                    self._message(address, "sys", f"Renamed device to {name}")
                    return state

            state.alias = name
            self._message(address, "sys", f"Set local alias to {name}")
            return state

    def clear_messages(self) -> None:
        self._messages.clear()

    def _ensure_state(self, address: str) -> BleDeviceState:
        state = self._devices.get(address)
        if state is None:
            state = BleDeviceState(address=address, name=address, rssi=-127)
            self._devices[address] = state
        return state

    async def _connect_inner(self, address: str) -> BleDeviceState:
        existing_state = self._devices.get(address)
        state = self._ensure_state(address)
        if state.is_connected:
            return state
        state.is_connecting = True
        state.last_error = None
        try:
            device_obj = await BleakScanner.find_device_by_address(address, timeout=5.0)
            if device_obj is None:
                raise BleakDeviceNotFoundError(address)
            if existing_state is None:
                state.name = device_obj.name or "Unknown"
                state.rssi = int(getattr(device_obj, "rssi", -127) or -127)
            else:
                state.name = device_obj.name or state.name
                state.rssi = int(getattr(device_obj, "rssi", state.rssi) or state.rssi)
            state.last_seen_at = datetime.now()

            client = BleakClient(
                device_obj,
                disconnected_callback=lambda _client, a=address: self._handle_disconnect(a),
                timeout=22.0,
                winrt={"use_cached_services": False},
            )
            await asyncio.wait_for(client.connect(), timeout=24.0)
            if client.services.get_service(NUS_SERVICE_UUID) is None:
                raise BleakError("Device does not expose Nordic UART Service")
            if client.services.get_service(GAP_SERVICE_UUID) is None:
                self._message(address, "sys", "Device does not expose GAP service; rename may not be available")
            self._clients[address] = _ClientState(device=device_obj, client=client)
            await client.start_notify(
                NUS_TX_UUID,
                lambda _char, data, a=address: self._on_notification(a, data),
            )
            state.is_connected = True
            self._message(address, "sys", "Connected")
            return state
        except Exception as exc:
            state.last_error = f"{type(exc).__name__}: {exc}"
            raise
        finally:
            state.is_connecting = False

    async def _disconnect_inner(self, address: str) -> BleDeviceState:
        client_state = self._clients.pop(address, None)
        state = self._ensure_state(address)
        if client_state is not None:
            try:
                if client_state.client.is_connected:
                    try:
                        await client_state.client.stop_notify(NUS_TX_UUID)
                    except Exception:
                        pass
                    await client_state.client.disconnect()
            finally:
                pass
        state.is_connected = False
        state.is_connecting = False
        return state

    def _message(self, address: str, direction: str, text: str) -> None:
        self._messages.append(
            BleMessage(
                timestamp=datetime.now(),
                address=address,
                direction=direction,
                message=text,
            )
        )
        if len(self._messages) > 1000:
            self._messages = self._messages[-500:]

    def _on_notification(self, address: str, data: bytes) -> None:
        client_state = self._clients.get(address)
        if client_state is None:
            return
        payload = client_state.rx_buffer + data
        while b"\n" in payload:
            raw_line, payload = payload.split(b"\n", 1)
            line = raw_line.rstrip(b"\r").decode("utf-8", errors="replace")
            if line:
                self._message(address, "rx", line)
        client_state.rx_buffer = payload[-2048:]

    def _handle_disconnect(self, address: str) -> None:
        state = self._devices.get(address)
        if state is not None:
            state.is_connected = False
            state.is_connecting = False
        self._clients.pop(address, None)
        self._message(address, "sys", "Disconnected")
