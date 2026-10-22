import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure app package is importable
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app.config import settings

client = TestClient(app)


def test_system_endpoints():
    """Verify system diagnostics endpoints return 200 OK."""
    r_root = client.get("/")
    assert r_root.status_code == 200
    assert r_root.json()["platform"] == settings.app_name

    r_health = client.get("/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "ok"

    r_ready = client.get("/ready")
    assert r_ready.status_code == 200
    assert r_ready.json()["models"] == "all_loaded"


def test_validation_error_handler():
    """Verify that malformed or missing fields produce clean 400 Bad Request responses."""
    # POST /api/v1/measurements without device_id
    r = client.post("/api/v1/measurements", json={})
    assert r.status_code == 400
    data = r.json()
    assert data["error"] is True
    assert data["status_code"] == 400
    assert "details" in data
    assert any("device_id" in d for d in data["details"])


def test_supabase_auth_lifecycle():
    """Test full Supabase Auth lifecycle: Sign Up, Sign In, Get Profile, Refresh, and Logout."""
    import uuid
    uid = uuid.uuid4().hex[:8]
    test_email = f"clinician_{uid}@hospital-uyir.org"
    test_password = "DoctorSecurePass2026!"
    test_name = f"Dr. Alex {uid}"

    # 1. Sign Up
    signup_payload = {
        "email": test_email,
        "password": test_password,
        "full_name": test_name,
        "role": "doctor"
    }
    r_signup = client.post("/api/v1/auth/signup", json=signup_payload)
    assert r_signup.status_code == 201, f"Signup failed: {r_signup.text}"
    signup_data = r_signup.json()
    assert "access_token" in signup_data
    token = signup_data["access_token"]
    assert signup_data["user"]["email"] == test_email
    assert signup_data["user"]["role"] == "doctor"
    user_id = signup_data["user"]["id"]

    # 2. Duplicate Sign Up should return 400
    r_dup = client.post("/api/v1/auth/signup", json=signup_payload)
    assert r_dup.status_code == 400
    assert "already exists" in r_dup.json()["message"]

    # 3. Sign In with invalid password should return 400
    r_bad_login = client.post("/api/v1/auth/login", json={"email": test_email, "password": "WrongPassword!"})
    assert r_bad_login.status_code == 400
    assert "Invalid email or password" in r_bad_login.json()["message"]

    # 4. Sign In with correct credentials
    r_login = client.post("/api/v1/auth/login", json={"email": test_email, "password": test_password})
    assert r_login.status_code == 200
    login_data = r_login.json()
    assert "access_token" in login_data
    auth_token = login_data["access_token"]
    assert login_data["user"]["id"] == user_id

    # 5. Get Profile with Bearer token
    headers = {"Authorization": f"Bearer {auth_token}"}
    r_me = client.get("/api/v1/auth/me", headers=headers)
    assert r_me.status_code == 200
    me_data = r_me.json()
    assert me_data["id"] == user_id
    assert me_data["email"] == test_email
    assert me_data["role"] == "doctor"

    # 6. Refresh Session Token
    r_refresh = client.post("/api/v1/auth/refresh", headers=headers)
    assert r_refresh.status_code == 200
    assert "access_token" in r_refresh.json()

    # 7. Logout
    r_logout = client.post("/api/v1/auth/logout", headers=headers)
    assert r_logout.status_code == 200
    assert r_logout.json()["success"] is True

    # 8. Password Reset Request
    r_reset = client.post("/api/v1/auth/reset-password", json={"email": test_email})
    assert r_reset.status_code == 200
    assert r_reset.json()["success"] is True


def test_telemetry_and_analyze_with_auth_and_keys():
    """Verify telemetry ingestion and AI analysis work with Bearer token and API key."""
    # 1. Device key auth for telemetry ingestion
    meas_payload = {
        "device_id": "esp32_test_node_99",
        "patient_id": "patient_alex",
        "heart_rate_bpm": 74.5,
        "spo2_percent": 98.2,
        "temperature_c": 36.6,
        "sensor_quality": "good",
        "ecg": 0.15,
        "bp_systolic": 118.0,
        "bp_diastolic": 78.0
    }
    r_meas = client.post(
        "/api/v1/measurements",
        json=meas_payload,
        headers={"X-API-Key": settings.device_api_key}
    )
    assert r_meas.status_code == 201
    assert r_meas.json()["saved_to_database"] is True

    # 2. Latest reading for device
    r_latest = client.get(
        "/api/v1/devices/esp32_test_node_99/latest",
        headers={"X-API-Key": settings.dashboard_api_key}
    )
    assert r_latest.status_code == 200
    assert r_latest.json()["device_id"] == "esp32_test_node_99"

    # 3. Multi-Model AI analysis with database persistence
    an_payload = {
        "heart_rate_bpm": 75.0,
        "spo2_percent": 98.5,
        "temperature_c": 36.6,
        "ecg": 0.12,
        "bp_systolic": 120.0,
        "bp_diastolic": 80.0
    }
    r_an = client.post(
        "/api/v1/devices/esp32_test_node_99/analyze",
        json=an_payload,
        headers={"X-API-Key": settings.dashboard_api_key}
    )
    assert r_an.status_code == 200
    an_res = r_an.json()
    assert an_res["saved_to_database"] is True
    assert an_res["result"] in ["NO_UNUSUAL_PATTERN", "UNUSUAL_PATTERN"]
