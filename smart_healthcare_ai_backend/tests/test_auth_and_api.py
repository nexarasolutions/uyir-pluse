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


def test_telemetry_workflow_empty_and_unknown_device_ids():
    """Verify empty telemetry (404), unknown device IDs, authentication rejection, and complete ingestion/retrieval cycle."""
    import uuid
    fresh_device_id = f"test_probe_{uuid.uuid4().hex[:6]}"

    # 1. Invalid API key or Bearer token is rejected with 401
    r_unauth = client.get(
        f"/api/v1/devices/{fresh_device_id}/latest",
        headers={"X-API-Key": "invalid_bad_key"}
    )
    assert r_unauth.status_code == 401

    # 2. Invalid ingestion credentials rejected with 401
    r_unauth_post = client.post(
        "/api/v1/measurements",
        json={"device_id": fresh_device_id},
        headers={"X-API-Key": "invalid_bad_key"}
    )
    assert r_unauth_post.status_code == 401

    # 3. Querying unknown device or empty telemetry before ingestion returns HTTP 404 with 'No telemetry' message
    r_empty = client.get(
        f"/api/v1/devices/{fresh_device_id}/latest",
        headers={"X-API-Key": settings.dashboard_api_key}
    )
    assert r_empty.status_code == 404
    err_data = r_empty.json()
    assert err_data["error"] is True
    assert "No telemetry" in err_data["message"]

    # 4. History for unknown device returns HTTP 200 with 0 count
    r_hist = client.get(
        f"/api/v1/devices/{fresh_device_id}/history",
        headers={"X-API-Key": settings.dashboard_api_key}
    )
    assert r_hist.status_code == 200
    assert r_hist.json()["count"] == 0
    assert r_hist.json()["items"] == []

    # 5. Successful authorized telemetry ingestion
    meas_payload = {
        "device_id": fresh_device_id,
        "patient_id": "patient_probe",
        "heart_rate_bpm": 72.0,
        "spo2_percent": 99.0,
        "temperature_c": 36.5,
        "sensor_quality": "good",
        "ecg": 0.14,
        "bp_systolic": 115.0,
        "bp_diastolic": 75.0
    }
    r_ingest = client.post(
        "/api/v1/measurements",
        json=meas_payload,
        headers={"X-API-Key": settings.device_api_key}
    )
    assert r_ingest.status_code == 201
    ingest_res = r_ingest.json()
    assert ingest_res["saved_to_database"] is True
    assert ingest_res["device_id"] == fresh_device_id

    # 6. Successful retrieval now returns 200 with the exact ingested telemetry
    r_retrieved = client.get(
        f"/api/v1/devices/{fresh_device_id}/latest",
        headers={"X-API-Key": settings.dashboard_api_key}
    )
    assert r_retrieved.status_code == 200
    retrieved_data = r_retrieved.json()
    assert retrieved_data["device_id"] == fresh_device_id
    assert retrieved_data["heart_rate_bpm"] == 72.0
    assert retrieved_data["spo2_percent"] == 99.0
    assert retrieved_data["temperature_c"] == 36.5

    # 7. AI analysis with full 5 clinical features succeeds
    an_payload = {
        "heart_rate_bpm": 72.0,
        "spo2_percent": 99.0,
        "temperature_c": 36.5,
        "ecg": 0.14,
        "bp_systolic": 115.0,
        "bp_diastolic": 75.0
    }
    r_an = client.post(
        f"/api/v1/devices/{fresh_device_id}/analyze",
        json=an_payload,
        headers={"X-API-Key": settings.dashboard_api_key}
    )
    assert r_an.status_code == 200
    assert r_an.json()["saved_to_database"] is True
    assert r_an.json()["result"] in ["NO_UNUSUAL_PATTERN", "UNUSUAL_PATTERN"]

    # 8. Dispatch hardware edge command
    cmd_payload = {"command": "trigger_buzzer", "payload": {"duration_ms": 500, "pattern": "sos"}}
    r_cmd = client.post(
        f"/api/v1/devices/{fresh_device_id}/command",
        json=cmd_payload,
        headers={"X-API-Key": settings.dashboard_api_key}
    )
    assert r_cmd.status_code == 200
    cmd_data = r_cmd.json()
    assert cmd_data["success"] is True
    assert cmd_data["command"] == "trigger_buzzer"
    assert cmd_data["status"] == "dispatched"
    assert "command_id" in cmd_data


def test_alert_actions_and_sos():
    """Verify alert acknowledgment and SOS emergency trigger (Phase 2)."""
    # 1. Trigger SOS emergency alert
    sos_payload = {
        "device_id": "esp32_device_01",
        "severity": "critical",
        "reason": "Test unit emergency distress trigger",
        "location": "Clinical Room 402"
    }
    r_sos = client.post(
        "/api/v1/alerts/sos",
        json=sos_payload,
        headers={"X-API-Key": settings.dashboard_api_key}
    )
    assert r_sos.status_code == 201
    sos_data = r_sos.json()
    assert sos_data["success"] is True
    assert "alert" in sos_data
    created_id = sos_data["alert"]["id"]
    assert sos_data["alert"]["alert_type"] == "MANUAL_SOS"

    # 2. Acknowledge the alert
    r_ack = client.patch(
        f"/api/v1/alerts/{created_id}/acknowledge",
        headers={"X-API-Key": settings.dashboard_api_key}
    )
    assert r_ack.status_code == 200
    ack_data = r_ack.json()
    assert ack_data["success"] is True
    assert ack_data["status"] == "acknowledged"
    assert "acknowledged_at" in ack_data


def test_care_and_automation_endpoints():
    """Verify prescriptions, medications, caregivers, and automation rules (Phase 4)."""
    headers = {"X-API-Key": settings.dashboard_api_key}

    # 1. Prescriptions
    r_rx = client.get("/api/v1/prescriptions", headers=headers)
    assert r_rx.status_code == 200
    rx_items = r_rx.json()["items"]
    assert len(rx_items) > 0
    first_rx_id = rx_items[0]["id"]

    r_refill = client.post(f"/api/v1/prescriptions/{first_rx_id}/refill", headers=headers)
    assert r_refill.status_code == 200
    assert r_refill.json()["success"] is True

    # 2. Medications
    r_meds = client.get("/api/v1/medications", headers=headers)
    assert r_meds.status_code == 200
    med_items = r_meds.json()["items"]
    assert len(med_items) > 0
    first_med_id = med_items[0]["id"]

    r_toggle = client.patch(
        f"/api/v1/medications/{first_med_id}/toggle",
        json={"taken": True},
        headers=headers
    )
    assert r_toggle.status_code == 200
    assert r_toggle.json()["success"] is True
    assert r_toggle.json()["medication"]["taken"] is True

    # 3. Caregivers
    r_cg = client.get("/api/v1/caregivers", headers=headers)
    assert r_cg.status_code == 200
    cg_items = r_cg.json()["items"]
    assert len(cg_items) > 0
    first_cg_id = cg_items[0]["id"]

    r_notify = client.post(
        f"/api/v1/caregivers/{first_cg_id}/notify",
        json={"message": "Routine vital check completed", "urgency": "normal"},
        headers=headers
    )
    assert r_notify.status_code == 200
    assert r_notify.json()["dispatched"] is True

    # 4. Automation Rules
    r_rules = client.get("/api/v1/automation/rules", headers=headers)
    assert r_rules.status_code == 200
    rules = r_rules.json()["items"]
    assert len(rules) > 0
    first_rule_id = rules[0]["id"]

    r_rule_toggle = client.patch(
        f"/api/v1/automation/rules/{first_rule_id}/toggle",
        json={"is_enabled": False},
        headers=headers
    )
    assert r_rule_toggle.status_code == 200
    assert r_rule_toggle.json()["success"] is True
    assert r_rule_toggle.json()["rule"]["is_enabled"] is False


def test_send_device_command():
    """Verify dispatching actuation commands to IoT edge hardware."""
    headers = {"X-API-Key": settings.dashboard_api_key}
    r = client.post(
        "/api/v1/devices/esp32_device_01/command",
        json={"command": "TEST_BUZZER", "payload": {"duration_ms": 1000}},
        headers=headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["command"] == "TEST_BUZZER"
    assert data["device_id"] == "esp32_device_01"
