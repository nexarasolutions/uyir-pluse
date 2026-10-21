import secrets
from fastapi import Header, HTTPException
from typing import Optional
from app.config import settings
def verify_device_key(x_device_key: Optional[str] = Header(default=None)):
    if not x_device_key or not secrets.compare_digest(x_device_key, settings.device_api_key):
        raise HTTPException(status_code=401, detail="Invalid device API key")
def verify_dashboard_key(x_dashboard_key: Optional[str] = Header(default=None)):
    if not x_dashboard_key or not secrets.compare_digest(x_dashboard_key, settings.dashboard_api_key):
        raise HTTPException(status_code=401, detail="Invalid dashboard API key")
