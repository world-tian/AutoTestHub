from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class BleScanRequest(BaseModel):
    seconds: float = Field(default=6.0, ge=1.0, le=30.0)
    query: Optional[str] = Field(default=None, description="Filter devices by name or address")


class BleConnectRequest(BaseModel):
    address: str = Field(..., min_length=1)


class BleDisconnectRequest(BaseModel):
    address: str = Field(..., min_length=1)


class BleSendRequest(BaseModel):
    address: Optional[str] = Field(default=None, description="Target address; omit to broadcast")
    message: str = Field(..., min_length=1)
    append_newline: bool = True
    broadcast: bool = False


class BleRenameRequest(BaseModel):
    address: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=240)
    characteristic_uuid: Optional[str] = Field(
        default=None,
        description="Override writable name characteristic UUID",
    )


class BleDeviceResponse(BaseModel):
    address: str
    name: str
    alias: Optional[str] = None
    rssi: int
    is_connected: bool
    is_connecting: bool
    last_seen_at: Optional[datetime] = None
    last_error: Optional[str] = None


class BleMessageResponse(BaseModel):
    timestamp: datetime
    address: str
    direction: str
    message: str


class BleStateResponse(BaseModel):
    scanning: bool
    last_scan_at: Optional[datetime] = None
    devices: list[BleDeviceResponse]
    messages: list[BleMessageResponse]
    connected_addresses: list[str]
