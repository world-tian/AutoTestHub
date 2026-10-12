from __future__ import annotations

from fastapi import APIRouter, HTTPException
from bleak.exc import BleakError

from app.schemas.ble import (
    BleConnectRequest,
    BleDeviceResponse,
    BleDisconnectRequest,
    BleMessageResponse,
    BleRenameRequest,
    BleScanRequest,
    BleSendRequest,
    BleStateResponse,
)
from app.services.ble import BleGateway

router = APIRouter()
gateway = BleGateway()


def _serialize_snapshot() -> BleStateResponse:
    snapshot = gateway.snapshot()
    return BleStateResponse(
        scanning=snapshot["scanning"],
        last_scan_at=snapshot["last_scan_at"],
        devices=[
            BleDeviceResponse(
                address=device.address,
                name=device.name,
                alias=device.alias,
                rssi=device.rssi,
                is_connected=device.is_connected,
                is_connecting=device.is_connecting,
                last_seen_at=device.last_seen_at,
                last_error=device.last_error,
            )
            for device in snapshot["devices"]
        ],
        messages=[
            BleMessageResponse(
                timestamp=message.timestamp,
                address=message.address,
                direction=message.direction,
                message=message.message,
            )
            for message in snapshot["messages"]
        ],
        connected_addresses=snapshot["connected_addresses"],
    )


@router.get("/ble/state", response_model=BleStateResponse)
async def get_ble_state() -> BleStateResponse:
    return _serialize_snapshot()


@router.post("/ble/scan", response_model=list[BleDeviceResponse])
async def scan_ble(request: BleScanRequest) -> list[BleDeviceResponse]:
    devices = await gateway.scan(seconds=request.seconds, query=request.query)
    return [
        BleDeviceResponse(
            address=device.address,
            name=device.name,
            rssi=device.rssi,
            is_connected=device.is_connected,
            is_connecting=device.is_connecting,
            last_seen_at=device.last_seen_at,
            last_error=device.last_error,
        )
        for device in devices
    ]


@router.post("/ble/connect", response_model=BleDeviceResponse)
async def connect_ble(request: BleConnectRequest) -> BleDeviceResponse:
    try:
        device = await gateway.connect(request.address)
    except BleakError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BleDeviceResponse(
        address=device.address,
        name=device.name,
        alias=device.alias,
        rssi=device.rssi,
        is_connected=device.is_connected,
        is_connecting=device.is_connecting,
        last_seen_at=device.last_seen_at,
        last_error=device.last_error,
    )


@router.post("/ble/disconnect", response_model=BleDeviceResponse)
async def disconnect_ble(request: BleDisconnectRequest) -> BleDeviceResponse:
    device = await gateway.disconnect(request.address)
    return BleDeviceResponse(
        address=device.address,
        name=device.name,
        alias=device.alias,
        rssi=device.rssi,
        is_connected=device.is_connected,
        is_connecting=device.is_connecting,
        last_seen_at=device.last_seen_at,
        last_error=device.last_error,
    )


@router.post("/ble/disconnect-all")
async def disconnect_all_ble() -> dict[str, str]:
    await gateway.disconnect_all()
    return {"message": "Disconnected all devices"}


@router.post("/ble/send")
async def send_ble(request: BleSendRequest) -> dict[str, object]:
    try:
        return await gateway.send(
            message=request.message,
            address=request.address,
            append_newline=request.append_newline,
            broadcast=request.broadcast,
        )
    except BleakError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/ble/rename", response_model=BleDeviceResponse)
async def rename_ble(request: BleRenameRequest) -> BleDeviceResponse:
    try:
        device = await gateway.rename(
            address=request.address,
            name=request.name,
            characteristic_uuid=request.characteristic_uuid,
        )
    except BleakError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BleDeviceResponse(
        address=device.address,
        name=device.name,
        alias=device.alias,
        rssi=device.rssi,
        is_connected=device.is_connected,
        is_connecting=device.is_connecting,
        last_seen_at=device.last_seen_at,
        last_error=device.last_error,
    )


@router.get("/ble/messages", response_model=list[BleMessageResponse])
async def list_ble_messages(limit: int = 200) -> list[BleMessageResponse]:
    snapshot = gateway.snapshot()
    messages = snapshot["messages"][-max(1, min(limit, 500)) :]
    return [
        BleMessageResponse(
            timestamp=message.timestamp,
            address=message.address,
            direction=message.direction,
            message=message.message,
        )
        for message in messages
    ]


@router.delete("/ble/messages")
async def clear_ble_messages() -> dict[str, str]:
    gateway.clear_messages()
    return {"message": "Cleared"}
