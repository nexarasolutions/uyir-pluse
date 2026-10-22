import secrets
from typing import Optional, Dict, Any
from fastapi import HTTPException, Request, Security, status
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings
from app.auth import decode_access_token

api_key_security = APIKeyHeader(
    name="X-API-Key",
    auto_error=False,
    description=f"Device or Dashboard API Key (e.g. Device: {settings.device_api_key})",
)

bearer_security = HTTPBearer(
    auto_error=False,
    description="Supabase JWT Bearer token (obtain via /api/v1/auth/login or /api/v1/auth/signup)",
)


def _extract_bearer_token(request: Request, credentials: Optional[HTTPAuthorizationCredentials]) -> Optional[str]:
    """Extracts raw JWT bearer token from HTTPBearer scheme or Authorization header."""
    if credentials and credentials.scheme.lower() == "bearer":
        return credentials.credentials.strip()
    auth = request.headers.get("authorization")
    if auth and auth.startswith("Bearer "):
        return auth.split("Bearer ", 1)[1].strip()
    return None


def _extract_api_key(request: Request, security_key: Optional[str]) -> Optional[str]:
    """Extracts API key from X-API-Key header or custom header variants."""
    if security_key:
        return security_key.strip()
    for header_name in ["x-api-key", "x-dashboard-key", "x-device-key"]:
        val = request.headers.get(header_name)
        if val:
            return val.strip()
    return None


def get_current_user(
    request: Request,
    bearer: Optional[HTTPAuthorizationCredentials] = Security(bearer_security),
) -> Optional[Dict[str, Any]]:
    """
    Validates Supabase Bearer token.
    Returns decoded user payload if valid, None if no bearer token passed.
    Raises HTTPException(401) if bearer token is provided but invalid/expired.
    """
    token = _extract_bearer_token(request, bearer)
    if not token:
        return None
    return decode_access_token(token)


def require_authenticated_user(
    request: Request,
    bearer: Optional[HTTPAuthorizationCredentials] = Security(bearer_security),
) -> Dict[str, Any]:
    """Strict dependency requiring a valid Supabase JWT Bearer token."""
    user = get_current_user(request, bearer)
    if user:
        return user
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please sign in or pass a valid Supabase Bearer token in Authorization header.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def verify_dashboard_key(
    request: Request,
    api_key: Optional[str] = Security(api_key_security),
    bearer: Optional[HTTPAuthorizationCredentials] = Security(bearer_security),
):
    """
    Authorizes clinical dashboard and patient monitoring requests.
    Accepts:
    1. Valid Supabase JWT Bearer token (from /api/v1/auth/login)
    2. Valid Dashboard API key (X-API-Key header)
    3. Frictionless development mode bypass when running locally without auth headers
    """
    # 1. Check Supabase Bearer token
    user = get_current_user(request, bearer)
    if user:
        return user

    # 2. Check Dashboard API key
    key = _extract_api_key(request, api_key)
    if key and secrets.compare_digest(key, settings.dashboard_api_key):
        return {"sub": "dashboard-api-key", "role": "admin"}

    # 3. Allow frictionless testing in development mode if no credentials passed
    if not key and not _extract_bearer_token(request, bearer) and settings.environment.lower() == "development":
        return {"sub": "dev-guest", "role": "developer"}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=(
            "Unauthorized. Please click 'Authorize 🔒' at top right of Swagger and either:\n"
            "1. Enter Supabase Bearer Token (under bearerAuth), OR\n"
            f"2. Enter Dashboard API Key: {settings.dashboard_api_key} (under X-API-Key)"
        ),
    )


def verify_device_key(
    request: Request,
    api_key: Optional[str] = Security(api_key_security),
    bearer: Optional[HTTPAuthorizationCredentials] = Security(bearer_security),
):
    """
    Authorizes IoT hardware device telemetry ingestion.
    Accepts:
    1. Valid Device API key (X-API-Key or x-device-key)
    2. Valid Dashboard API key
    3. Valid Supabase JWT Bearer token
    4. Frictionless development mode bypass when running locally without auth headers
    """
    # 1. Check Device or Dashboard API key
    key = _extract_api_key(request, api_key)
    if key:
        is_device = secrets.compare_digest(key, settings.device_api_key)
        is_dashboard = secrets.compare_digest(key, settings.dashboard_api_key)
        if is_device or is_dashboard:
            return {"sub": "iot-device" if is_device else "dashboard", "role": "device"}

    # 2. Check Supabase Bearer token
    user = get_current_user(request, bearer)
    if user:
        return user

    # 3. Development mode bypass
    if not key and not _extract_bearer_token(request, bearer) and settings.environment.lower() == "development":
        return {"sub": "dev-device", "role": "developer"}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=(
            "Unauthorized IoT sensor node. Click 'Authorize 🔒' at top right of Swagger and enter:\n"
            f"Device API Key: {settings.device_api_key}"
        ),
    )
