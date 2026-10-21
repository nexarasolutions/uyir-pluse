import secrets
from typing import Optional
from fastapi import Header, HTTPException, Security
from fastapi.security import APIKeyHeader
from app.config import settings

dashboard_key_header = APIKeyHeader(name="x-dashboard-key", auto_error=False)
device_key_header = APIKeyHeader(name="x-device-key", auto_error=False)

def verify_dashboard_key(
    header_key: Optional[str] = Security(dashboard_key_header),
    x_api_key: Optional[str] = Header(default=None),
    authorization: Optional[str] = Header(default=None),
):
    key = header_key or x_api_key
    if not key and authorization:
        if authorization.startswith("Bearer "):
            key = authorization.split("Bearer ", 1)[1].strip()
        else:
            key = authorization.strip()

    if not key or not secrets.compare_digest(key, settings.dashboard_api_key):
        raise HTTPException(status_code=401, detail="Invalid dashboard API key")

def verify_device_key(
    header_key: Optional[str] = Security(device_key_header),
    x_api_key: Optional[str] = Header(default=None),
    authorization: Optional[str] = Header(default=None),
):
    key = header_key or x_api_key
    if not key and authorization:
        if authorization.startswith("Bearer "):
            key = authorization.split("Bearer ", 1)[1].strip()
        else:
            key = authorization.strip()

    if not key or not secrets.compare_digest(key, settings.device_api_key):
        raise HTTPException(status_code=401, detail="Invalid device API key")
