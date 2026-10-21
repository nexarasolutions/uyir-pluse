import secrets
from typing import Optional
from fastapi import HTTPException, Request, Security
from fastapi.security import APIKeyHeader
from app.config import settings

api_key_security = APIKeyHeader(
    name="X-API-Key",
    auto_error=False,
    description="Enter your API Key (Dashboard or Device Key)",
)


def _extract_key(request: Request, security_key: Optional[str]) -> Optional[str]:
    """Extract key from Swagger security scheme or HTTP headers without polluting OpenAPI parameters."""
    if security_key:
        return security_key
    for header_name in ["x-api-key", "x-dashboard-key", "x-device-key"]:
        val = request.headers.get(header_name)
        if val:
            return val
    auth = request.headers.get("authorization")
    if auth:
        if auth.startswith("Bearer "):
            return auth.split("Bearer ", 1)[1].strip()
        return auth.strip()
    return None


def verify_dashboard_key(
    request: Request,
    api_key: Optional[str] = Security(api_key_security),
):
    key = _extract_key(request, api_key)
    if not key or not secrets.compare_digest(key, settings.dashboard_api_key):
        raise HTTPException(
            status_code=401,
            detail="Invalid dashboard API key. Click 'Authorize' at the top right of Swagger and enter your dashboard API key.",
        )


def verify_device_key(
    request: Request,
    api_key: Optional[str] = Security(api_key_security),
):
    key = _extract_key(request, api_key)
    is_device = secrets.compare_digest(key, settings.device_api_key) if key else False
    is_dashboard = secrets.compare_digest(key, settings.dashboard_api_key) if key else False
    if not (is_device or is_dashboard):
        raise HTTPException(
            status_code=401,
            detail="Invalid device API key. Click 'Authorize' at the top right of Swagger and enter your API key.",
        )
