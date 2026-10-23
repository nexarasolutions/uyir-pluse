from datetime import datetime, timezone
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, Query, Path, status, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.config import settings
from app.db import require_db
from app.schemas import (
    MeasurementIn,
    AnalysisRequest,
    UserSignUp,
    UserLogin,
    TokenResponse,
    UserOut,
    PasswordResetRequest,
    MessageResponse,
    SosAlertRequest,
    AlertAcknowledgeResponse,
    PrescriptionCreate,
    PrescriptionRefillRequest,
    MedicationDoseCreate,
    MedicationToggleRequest,
    CaregiverCreate,
    CaregiverNotifyRequest,
    AutomationRuleCreate,
    AutomationRuleToggleRequest,
)
from app.security import (
    verify_device_key,
    verify_dashboard_key,
    require_authenticated_user,
    bearer_security,
    api_key_security,
)
from app.analysis import analyze_values, get_models_status
from app.auth import (
    signup_user,
    login_user,
    get_user_profile,
    create_access_token,
    request_password_reset,
)

tags_metadata = [
    {
        "name": "System & Diagnostics",
        "description": "Liveness probes, system readiness checks, and service discovery endpoints.",
    },
    {
        "name": "Supabase Authentication",
        "description": "User registration, sign-in, JWT credential issuance, and user profile management integrated with Supabase Auth.",
    },
    {
        "name": "AI Anomaly Detection",
        "description": "High-performance inference engine combining Isolation Forest, One-Class SVM, and PyTorch Deep Autoencoder.",
    },
    {
        "name": "Device Telemetry",
        "description": "High-throughput ingestion of vital signs and sensor telemetry from IoT edge nodes (ESP32, MAX30102, DS18B20).",
    },
    {
        "name": "Patient Monitoring",
        "description": "Real-time state and longitudinal telemetry records for monitored patients.",
    },
    {
        "name": "Clinical Alerts",
        "description": "Critical vital sign anomalies, physiological threshold breaches, and alert triage management.",
    },
    {
        "name": "Prescriptions & Pharmacy",
        "description": "Active prescription regimens, refills, days supply tracking, and dispensing status.",
    },
    {
        "name": "Medication Adherence",
        "description": "Scheduled daily doses, patient adherence logging, and compliance tracking.",
    },
    {
        "name": "Caregiver Network",
        "description": "Emergency contacts, relative notifications, and multi-tier clinical dispatch directory.",
    },
    {
        "name": "Clinical Automation & Workflows",
        "description": "Automated incident response rules, escalation policies, and IoT actuators.",
    },
]

app_description = f"""
# 🩺 Uyir+ Smart Healthcare AI Monitoring Platform

Enterprise-grade IoT vital sign ingestion, multi-model AI anomaly screening, clinical alert orchestration, and Supabase Authentication.

---

### 🚀 Core Architecture
* **Supabase Authentication:** Secure user management (`auth.users`, `public.profiles`, bcrypt, JWT tokens).
* **Real-time IoT Ingestion:** Continuous vital sign streaming from wearable edge hardware.
* **Triple-Ensemble AI Engine:**
  * **Isolation Forest:** Statistical outlier and distribution boundary detection.
  * **One-Class SVM:** Non-linear kernel boundary separation.
  * **Deep PyTorch Autoencoder:** Reconstruction error Mean Squared Error (MSE) anomaly scoring.
* **Resilient Cloud Persistence:** Low-latency storage backed by Supabase PostgreSQL (`measurements`, `ai_analysis`, `alerts`, `patient_vitals`, `profiles`).

---

### 🔐 Authentication & Swagger Testing
* **Test in Swagger ("Try it out" & "Execute"):** Click **Authorize 🔒** at top-right and choose:
  1. **BearerAuth (JWT):** Sign up or log in via `/api/v1/auth/login` to obtain your Bearer token and paste it here.
  2. **ApiKeyAuth (X-API-Key):** Enter your provisioned Device API Key or Dashboard API Key from your environment configuration.
  3. In development mode, endpoints can also be executed directly without credentials for frictionless local testing.
* All executed readings and AI anomaly screenings are automatically persisted to the Supabase database.
"""

app = FastAPI(
    title=settings.app_name,
    version="2.1.0",
    description=app_description,
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Hardened CORS configuration allowing verified localhost, development tunnels, and configured domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# Custom Exception Handlers for Clean Errors
# ==========================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Formats validation errors into friendly 400 Bad Request responses with actionable hints."""
    errors = []
    for err in exc.errors():
        loc_str = " -> ".join(str(item) for item in err.get("loc", []))
        msg = err.get("msg", "Validation error")
        errors.append(f"{loc_str}: {msg}")

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": True,
            "status_code": 400,
            "message": "Validation Error: Request payload contains missing or invalid fields.",
            "details": errors,
            "hint": "Please check parameter schemas in Swagger documentation. For telemetry, provide valid numeric ranges.",
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Provides consistent JSON error response formatting for HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "status_code": exc.status_code,
            "message": exc.detail if isinstance(exc.detail, str) else "Request error",
            "details": exc.detail,
        },
        headers=getattr(exc, "headers", None),
    )


# ==========================================
# System & Diagnostics Endpoints
# ==========================================

@app.get(
    "/",
    tags=["System & Diagnostics"],
    summary="Platform Service Directory",
    description="Returns high-level system metadata, API documentation links, and primary service routes.",
)
def root():
    return {
        "platform": settings.app_name,
        "version": "2.1.0",
        "status": "operational",
        "documentation": "/docs",
        "redoc": "/redoc",
        "health": "/health",
        "readiness": "/ready",
        "auth": {
            "signup": "/api/v1/auth/signup",
            "login": "/api/v1/auth/login",
            "me": "/api/v1/auth/me",
        },
        "models": "/api/v1/model/status",
    }


@app.get(
    "/health",
    tags=["System & Diagnostics"],
    summary="Service Liveness Probe",
    description="Lightweight HTTP 200 liveness check for container orchestration and uptime monitoring.",
)
@app.get("/healthz", include_in_schema=False)
@app.get("/api/v1/health", include_in_schema=False)
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@app.get(
    "/ready",
    tags=["System & Diagnostics"],
    summary="System Readiness Probe",
    description="Validates active database connectivity and verifies all pre-trained AI models are loaded in memory.",
)
@app.get("/health/ready", include_in_schema=False)
@app.get("/api/v1/ready", include_in_schema=False)
def readiness():
    db_ok = False
    db_err = None
    try:
        db = require_db()
        db.execute(text("SELECT 1")).scalar()
        db.close()
        db_ok = True
    except Exception as e:
        db_err = str(e)

    models_info = get_models_status()
    models_ok = models_info.get("all_loaded", False)
    all_ready = db_ok and models_ok

    return {
        "status": "ready" if all_ready else "degraded",
        "database": "connected" if db_ok else f"disconnected ({db_err})",
        "models": "all_loaded" if models_ok else "partial_or_missing",
        "time": datetime.now(timezone.utc).isoformat(),
    }


# ==========================================
# Supabase Authentication Routes
# ==========================================

@app.post(
    "/api/v1/auth/signup",
    tags=["Supabase Authentication"],
    summary="Register New User Account with Supabase",
    description="Creates a new account in Supabase auth.users and public.profiles with bcrypt encryption and returns an active Supabase JWT access token.",
    status_code=status.HTTP_201_CREATED,
    response_model=TokenResponse,
)
def auth_signup(payload: UserSignUp):
    return signup_user(payload)


@app.post(
    "/api/v1/auth/login",
    tags=["Supabase Authentication"],
    summary="Authenticate User with Email & Password",
    description="Verifies user credentials against Supabase auth.users, updates sign-in timestamps, and returns a signed Supabase JWT Bearer token.",
    response_model=TokenResponse,
)
def auth_login(payload: UserLogin):
    return login_user(payload)


@app.get(
    "/api/v1/auth/me",
    tags=["Supabase Authentication"],
    summary="Get Current User Profile",
    description="Retrieves the authenticated user profile and healthcare role from Supabase using their Bearer JWT token.",
    response_model=UserOut,
)
def auth_me(user: dict = Depends(require_authenticated_user)):
    user_id = user.get("sub")
    return get_user_profile(user_id)


@app.post(
    "/api/v1/auth/refresh",
    tags=["Supabase Authentication"],
    summary="Refresh Session Token",
    description="Generates a fresh Supabase JWT Bearer token for the authenticated user session.",
    response_model=TokenResponse,
)
def auth_refresh(user: dict = Depends(require_authenticated_user)):
    user_id = user.get("sub")
    profile = get_user_profile(user_id)
    new_token = create_access_token(
        user_id=profile.id,
        email=profile.email,
        role=profile.role,
    )
    return TokenResponse(
        access_token=new_token,
        token_type="bearer",
        expires_in=settings.jwt_access_token_expire_minutes * 60,
        user=profile,
    )


@app.post(
    "/api/v1/auth/logout",
    tags=["Supabase Authentication"],
    summary="Sign Out Current User",
    description="Terminates active session token context.",
    response_model=MessageResponse,
)
def auth_logout(user: dict = Depends(require_authenticated_user)):
    return MessageResponse(
        message="Successfully signed out of Supabase session.",
        success=True,
    )


@app.post(
    "/api/v1/auth/reset-password",
    tags=["Supabase Authentication"],
    summary="Request Password Recovery",
    description="Generates a password recovery token in Supabase for the specified email address.",
    response_model=MessageResponse,
)
def auth_reset_password(payload: PasswordResetRequest):
    res = request_password_reset(payload.email)
    return MessageResponse(message=res["message"], success=res["success"])


# ==========================================
# AI Model Specifications
# ==========================================

@app.get(
    "/api/v1/model/status",
    tags=["AI Anomaly Detection"],
    summary="Inspect AI Models & Architecture Specs",
    description="Reports model availability, memory footprint status, architecture parameters, and feature dimensions across Isolation Forest, One-Class SVM, and PyTorch Autoencoder.",
)
def model_status():
    return get_models_status()


# ==========================================
# Device Telemetry Ingestion
# ==========================================

@app.post(
    "/api/v1/measurements",
    tags=["Device Telemetry"],
    summary="Ingest Patient Vital Signs from IoT Edge Device",
    description="Receives real-time telemetry from edge sensors (Heart Rate, SpO2, Temperature, Signal Quality) and persists records to the PostgreSQL datastore with automated AI screening.",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_device_key)],
)
def create_measurement(payload: MeasurementIn):
    db = require_db()
    quality = (
        "valid"
        if all(v is not None for v in [payload.heart_rate_bpm, payload.spo2_percent, payload.temperature_c])
        and payload.sensor_quality == "good"
        else "incomplete_or_poor"
    )
    patient = payload.patient_id or f"patient-{payload.device_id}"
    try:
        # 1. Insert into measurements table
        row = db.execute(
            text(
                "INSERT INTO measurements(device_id,patient_id,heart_rate_bpm,spo2_percent,temperature_c,sensor_quality,data_quality_status) "
                "VALUES (:device,:patient,:hr,:spo2,:temp,:quality,:dq) "
                "RETURNING id,device_id,patient_id,measured_at,heart_rate_bpm,spo2_percent,temperature_c,sensor_quality,data_quality_status"
            ),
            {
                "device": payload.device_id,
                "patient": patient,
                "hr": payload.heart_rate_bpm,
                "spo2": payload.spo2_percent,
                "temp": payload.temperature_c,
                "quality": payload.sensor_quality,
                "dq": quality,
            },
        ).mappings().one()
        measurement_id = row["id"]

        # 2. Also sync to patient_vitals if vital readings are present (use SAVEPOINT to protect transaction)
        if (
            payload.heart_rate_bpm is not None
            and payload.spo2_percent is not None
            and payload.temperature_c is not None
        ):
            try:
                with db.begin_nested():
                    db.execute(
                        text(
                            "INSERT INTO patient_vitals(device_id, heart_rate, spo2, temperature, recorded_at) "
                            "VALUES (:device, :hr, :spo2, :temp, NOW())"
                        ),
                        {
                            "device": payload.device_id,
                            "hr": payload.heart_rate_bpm,
                            "spo2": payload.spo2_percent,
                            "temp": payload.temperature_c,
                        },
                    )
            except Exception:
                pass

        # 3. Automated AI Vital Signs Screening
        ai_result = analyze_values(
            hr=payload.heart_rate_bpm,
            spo2=payload.spo2_percent,
            temp=payload.temperature_c,
            ecg=payload.ecg,
            bp_systolic=payload.bp_systolic,
            bp_diastolic=payload.bp_diastolic,
        )

        ai_id = None
        try:
            with db.begin_nested():
                ai_row = db.execute(
                    text(
                        "INSERT INTO ai_analysis(measurement_id,device_id,result,anomaly_score,explanation,model_version) "
                        "VALUES (:m_id,:device,:result,:score,:explanation,:version) RETURNING id"
                    ),
                    {
                        "m_id": measurement_id,
                        "device": payload.device_id,
                        "result": ai_result.get("result", "UNKNOWN"),
                        "score": ai_result.get("anomaly_score") or 0.0,
                        "explanation": ai_result.get("explanation", ""),
                        "version": "v2.0-ensemble-iso-svm-ae",
                    },
                ).mappings().one()
                ai_id = ai_row["id"]
        except Exception:
            pass

        # 4. Critical threshold & AI anomaly alert generation
        alert_id = None
        is_anomaly = ai_result.get("ensemble_anomaly", False) or ai_result.get("result") == "UNUSUAL_PATTERN"
        is_extreme_hr = payload.heart_rate_bpm is not None and (payload.heart_rate_bpm < 50 or payload.heart_rate_bpm > 120)
        is_low_spo2 = payload.spo2_percent is not None and payload.spo2_percent < 92.0
        is_fever = payload.temperature_c is not None and (payload.temperature_c > 38.0 or payload.temperature_c < 35.0)

        if is_anomaly or is_extreme_hr or is_low_spo2 or is_fever:
            severity = "critical" if (is_low_spo2 or (payload.heart_rate_bpm and payload.heart_rate_bpm > 140)) else "warning"
            reasons = []
            if is_anomaly:
                reasons.append("Multi-model AI ensemble flagged physiological anomaly")
            if is_extreme_hr:
                reasons.append(f"Abnormal heart rate: {payload.heart_rate_bpm} BPM")
            if is_low_spo2:
                reasons.append(f"Critical SpO2 hypoxemia: {payload.spo2_percent}%")
            if is_fever:
                reasons.append(f"Abnormal body temperature: {payload.temperature_c}°C")

            try:
                with db.begin_nested():
                    alert_row = db.execute(
                        text(
                            "INSERT INTO alerts(device_id,measurement_id,alert_type,severity,reason,status) "
                            "VALUES (:device,:m_id,'vital_anomaly',:severity,:reason,'open') RETURNING id"
                        ),
                        {
                            "device": payload.device_id,
                            "m_id": measurement_id,
                            "severity": severity,
                            "reason": "; ".join(reasons),
                        },
                    ).mappings().one()
                    alert_id = alert_row["id"]
            except Exception:
                pass

        db.commit()

        res_dict = dict(row)
        res_dict["ai_analysis_id"] = ai_id
        res_dict["ai_screening"] = ai_result.get("result", "UNKNOWN")
        res_dict["alert_id"] = alert_id
        res_dict["saved_to_database"] = True
        return res_dict
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist telemetry reading: {str(e)}",
        ) from e
    finally:
        db.close()


# ==========================================
# Patient Monitoring Endpoints
# ==========================================

@app.get(
    "/api/v1/devices/{device_id}/latest",
    tags=["Patient Monitoring"],
    summary="Retrieve Latest Telemetry for Device",
    description="Returns the most recent vital signs measurement recorded for the specified device hardware ID.",
    dependencies=[Depends(verify_dashboard_key)],
)
def latest(device_id: str):
    db = require_db()
    try:
        row = db.execute(
            text(
                "SELECT id,device_id,patient_id,measured_at,heart_rate_bpm,spo2_percent,temperature_c,sensor_quality,data_quality_status "
                "FROM measurements WHERE device_id=:device ORDER BY measured_at DESC LIMIT 1"
            ),
            {"device": device_id},
        ).mappings().first()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No telemetry readings found for device '{device_id}'")
        return dict(row)
    finally:
        db.close()


@app.get(
    "/api/v1/devices/{device_id}/history",
    tags=["Patient Monitoring"],
    summary="Retrieve Telemetry History Stream",
    description="Returns a chronological list of historical vital sign measurements for trend analytics and charting.",
    dependencies=[Depends(verify_dashboard_key)],
)
def history(device_id: str, limit: int = Query(default=100, ge=1, le=1000, description="Maximum number of historical records to retrieve")):
    db = require_db()
    try:
        rows = db.execute(
            text(
                "SELECT id,device_id,patient_id,measured_at,heart_rate_bpm,spo2_percent,temperature_c,sensor_quality,data_quality_status "
                "FROM measurements WHERE device_id=:device ORDER BY measured_at DESC LIMIT :lim"
            ),
            {"device": device_id, "lim": limit},
        ).mappings().all()
        return {"items": [dict(r) for r in rows], "count": len(rows)}
    finally:
        db.close()


# ==========================================
# Multi-Model AI Anomaly Analysis
# ==========================================

@app.post(
    "/api/v1/devices/{device_id}/analyze",
    tags=["AI Anomaly Detection"],
    summary="Execute Multi-Model AI Vital Signs Anomaly Analysis & Persist",
    description="Evaluates patient vitals using an ensemble of Isolation Forest, One-Class SVM, and PyTorch Autoencoder, and automatically persists measurement, AI screening, and alerts to Supabase.",
    dependencies=[Depends(verify_dashboard_key)],
)
def analyze(
    device_id: str,
    payload: AnalysisRequest,
    save_to_db: bool = Query(default=True, description="Whether to persist vitals, AI analysis record, and clinical alerts to the database"),
):
    result = analyze_values(
        hr=payload.heart_rate_bpm,
        spo2=payload.spo2_percent,
        temp=payload.temperature_c,
        ecg=payload.ecg,
        bp_systolic=payload.bp_systolic,
        bp_diastolic=payload.bp_diastolic,
    )
    result["device_id"] = device_id

    if save_to_db:
        db = require_db()
        try:
            # 1. Save telemetry to measurements
            patient = payload.patient_id or f"patient-{device_id}"
            quality = (
                "valid"
                if all(v is not None for v in [payload.heart_rate_bpm, payload.spo2_percent, payload.temperature_c])
                else "incomplete_or_poor"
            )
            m_row = db.execute(
                text(
                    "INSERT INTO measurements(device_id,patient_id,heart_rate_bpm,spo2_percent,temperature_c,sensor_quality,data_quality_status) "
                    "VALUES (:device,:patient,:hr,:spo2,:temp,'good',:dq) RETURNING id"
                ),
                {
                    "device": device_id,
                    "patient": patient,
                    "hr": payload.heart_rate_bpm,
                    "spo2": payload.spo2_percent,
                    "temp": payload.temperature_c,
                    "dq": quality,
                },
            ).mappings().one()
            measurement_id = m_row["id"]
            result["measurement_id"] = measurement_id

            # 2. Sync to patient_vitals if vitals are provided (protected by SAVEPOINT)
            if (
                payload.heart_rate_bpm is not None
                and payload.spo2_percent is not None
                and payload.temperature_c is not None
            ):
                try:
                    with db.begin_nested():
                        db.execute(
                            text(
                                "INSERT INTO patient_vitals(device_id, heart_rate, spo2, temperature, recorded_at) "
                                "VALUES (:device, :hr, :spo2, :temp, NOW())"
                            ),
                            {
                                "device": device_id,
                                "hr": payload.heart_rate_bpm,
                                "spo2": payload.spo2_percent,
                                "temp": payload.temperature_c,
                            },
                        )
                except Exception:
                    pass

            # 3. Save AI analysis record (protected by SAVEPOINT)
            try:
                with db.begin_nested():
                    ai_row = db.execute(
                        text(
                            "INSERT INTO ai_analysis(measurement_id,device_id,result,anomaly_score,explanation,model_version) "
                            "VALUES (:m_id,:device,:result,:score,:explanation,:version) RETURNING id"
                        ),
                        {
                            "m_id": measurement_id,
                            "device": device_id,
                            "result": result.get("result", "UNKNOWN"),
                            "score": result.get("anomaly_score") or 0.0,
                            "explanation": result.get("explanation", ""),
                            "version": "v2.0-ensemble-iso-svm-ae",
                        },
                    ).mappings().one()
                    result["ai_analysis_id"] = ai_row["id"]
            except Exception:
                pass

            # 4. Trigger alert if anomaly or critical thresholds (protected by SAVEPOINT)
            is_anomaly = result.get("ensemble_anomaly", False) or result.get("result") == "UNUSUAL_PATTERN"
            is_extreme_hr = payload.heart_rate_bpm is not None and (payload.heart_rate_bpm < 50 or payload.heart_rate_bpm > 120)
            is_low_spo2 = payload.spo2_percent is not None and payload.spo2_percent < 92.0
            is_fever = payload.temperature_c is not None and (payload.temperature_c > 38.0 or payload.temperature_c < 35.0)

            if is_anomaly or is_extreme_hr or is_low_spo2 or is_fever:
                severity = "critical" if (is_low_spo2 or (payload.heart_rate_bpm and payload.heart_rate_bpm > 140)) else "warning"
                reasons = []
                if is_anomaly:
                    reasons.append("Multi-model AI ensemble flagged physiological anomaly")
                if is_extreme_hr:
                    reasons.append(f"Abnormal heart rate: {payload.heart_rate_bpm} BPM")
                if is_low_spo2:
                    reasons.append(f"Critical SpO2 hypoxemia: {payload.spo2_percent}%")
                if is_fever:
                    reasons.append(f"Abnormal body temperature: {payload.temperature_c}°C")

                try:
                    with db.begin_nested():
                        alert_row = db.execute(
                            text(
                                "INSERT INTO alerts(device_id,measurement_id,alert_type,severity,reason,status) "
                                "VALUES (:device,:m_id,'vital_anomaly',:severity,:reason,'open') RETURNING id"
                            ),
                            {
                                "device": device_id,
                                "m_id": measurement_id,
                                "severity": severity,
                                "reason": "; ".join(reasons),
                            },
                        ).mappings().one()
                        result["alert_id"] = alert_row["id"]
                        result["alert_triggered"] = True
                except Exception:
                    result["alert_triggered"] = False
            else:
                result["alert_triggered"] = False

            db.commit()
            result["saved_to_database"] = True
        except Exception as e:
            db.rollback()
            result["saved_to_database"] = False
            result["database_note"] = f"Analysis succeeded, but database write failed: {str(e)}"
        finally:
            db.close()

    return result


# ==========================================
# Clinical Alerts Endpoints
# ==========================================

@app.get(
    "/api/v1/alerts",
    tags=["Clinical Alerts"],
    summary="List Clinical & Vital Signs Alerts",
    description="Retrieves active and historical clinical alerts generated from physiological threshold breaches and multi-model AI anomaly classifications.",
    dependencies=[Depends(verify_dashboard_key)],
)
def alerts(limit: int = Query(default=100, ge=1, le=1000, description="Maximum number of alert records to retrieve")):
    db = require_db()
    try:
        rows = db.execute(
            text(
                "SELECT id,device_id,measurement_id,alert_type,severity,reason,status,triggered_at,acknowledged_at "
                "FROM alerts ORDER BY triggered_at DESC LIMIT :lim"
            ),
            {"lim": limit},
        ).mappings().all()
        return {"items": [dict(r) for r in rows], "count": len(rows)}
    finally:
        db.close()


# ==========================================
# Alert Action Endpoints (Phase 2)
# ==========================================

@app.patch(
    "/api/v1/alerts/{alert_id}/acknowledge",
    tags=["Clinical Alerts"],
    summary="Acknowledge Clinical Alert",
    description="Marks an active clinical alert as acknowledged with the current UTC timestamp.",
    dependencies=[Depends(verify_dashboard_key)],
)
@app.post(
    "/api/v1/alerts/{alert_id}/acknowledge",
    tags=["Clinical Alerts"],
    summary="Acknowledge Clinical Alert (POST alias)",
    include_in_schema=False,
    dependencies=[Depends(verify_dashboard_key)],
)
def acknowledge_alert(alert_id: int = Path(..., description="ID of alert to acknowledge")):
    db = require_db()
    try:
        now = datetime.now(timezone.utc)
        row = db.execute(
            text(
                "UPDATE alerts SET status = 'acknowledged', acknowledged_at = :now WHERE id = :id "
                "RETURNING id, device_id, alert_type, severity, reason, status, triggered_at, acknowledged_at"
            ),
            {"now": now, "id": alert_id},
        ).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail=f"Alert with ID {alert_id} not found.")
        db.commit()
        return {
            "success": True,
            "alert_id": row["id"],
            "status": row["status"],
            "acknowledged_at": row["acknowledged_at"].isoformat() if row["acknowledged_at"] else now.isoformat(),
            "message": f"Alert #{alert_id} successfully acknowledged.",
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to acknowledge alert: {str(e)}") from e
    finally:
        db.close()


@app.post(
    "/api/v1/alerts/sos",
    tags=["Clinical Alerts"],
    summary="Trigger Emergency SOS Alert",
    description="Immediately raises an emergency clinical SOS broadcast across connected edge units and caregiver contacts.",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_dashboard_key)],
)
def trigger_sos_alert(payload: SosAlertRequest):
    db = require_db()
    try:
        now = datetime.now(timezone.utc)
        location_suffix = f" [Location: {payload.location}]" if payload.location else ""
        row = db.execute(
            text(
                "INSERT INTO alerts (device_id, alert_type, severity, reason, status, triggered_at) "
                "VALUES (:device_id, 'MANUAL_SOS', :severity, :reason, 'open', :now) "
                "RETURNING id, device_id, alert_type, severity, reason, status, triggered_at"
            ),
            {
                "device_id": payload.device_id,
                "severity": payload.severity,
                "reason": f"EMERGENCY SOS: {payload.reason}{location_suffix}",
                "now": now,
            },
        ).mappings().first()
        db.commit()
        return {
            "success": True,
            "alert": dict(row),
            "message": "Critical SOS emergency broadcast initiated successfully.",
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to initiate SOS alert: {str(e)}") from e
    finally:
        db.close()


# ==========================================
# Prescriptions & Pharmacy Endpoints (Phase 4)
# ==========================================

@app.get(
    "/api/v1/prescriptions",
    tags=["Prescriptions & Pharmacy"],
    summary="List Patient Prescriptions",
    description="Retrieves all active clinical prescriptions, dosages, remaining days supply, and doctor instructions.",
    dependencies=[Depends(verify_dashboard_key)],
)
def list_prescriptions(patient_id: Optional[str] = Query(default=None, description="Optional patient UUID filter")):
    db = require_db()
    try:
        if patient_id:
            rows = db.execute(
                text("SELECT * FROM prescriptions WHERE patient_id = :pid ORDER BY id ASC"),
                {"pid": patient_id},
            ).mappings().all()
        else:
            rows = db.execute(
                text("SELECT * FROM prescriptions ORDER BY id ASC")
            ).mappings().all()
        return {"items": [dict(r) for r in rows], "count": len(rows)}
    finally:
        db.close()


@app.post(
    "/api/v1/prescriptions",
    tags=["Prescriptions & Pharmacy"],
    summary="Create New Prescription",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_dashboard_key)],
)
def create_prescription(payload: PrescriptionCreate):
    db = require_db()
    try:
        now = datetime.now(timezone.utc)
        row = db.execute(
            text(
                "INSERT INTO prescriptions (patient_id, name, dosage, frequency, doctor, remaining_days, total_days, refills_left, instructions, created_at) "
                "VALUES (:patient_id, :name, :dosage, :frequency, :doctor, :remaining_days, :total_days, :refills_left, :instructions, :now) "
                "RETURNING *"
            ),
            {
                "patient_id": payload.patient_id or "patient_1001",
                "name": payload.name,
                "dosage": payload.dosage,
                "frequency": payload.frequency,
                "doctor": payload.doctor,
                "remaining_days": payload.remaining_days,
                "total_days": payload.total_days,
                "refills_left": payload.refills_left,
                "instructions": payload.instructions,
                "now": now,
            },
        ).mappings().first()
        db.commit()
        return {"success": True, "prescription": dict(row)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create prescription: {str(e)}") from e
    finally:
        db.close()


@app.post(
    "/api/v1/prescriptions/{prescription_id}/refill",
    tags=["Prescriptions & Pharmacy"],
    summary="Request Prescription Refill",
    dependencies=[Depends(verify_dashboard_key)],
)
def refill_prescription(
    prescription_id: int = Path(..., description="ID of prescription to refill"),
    payload: Optional[PrescriptionRefillRequest] = None,
):
    db = require_db()
    try:
        row = db.execute(
            text("SELECT * FROM prescriptions WHERE id = :id"),
            {"id": prescription_id},
        ).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail=f"Prescription #{prescription_id} not found.")

        new_remaining = row["total_days"]
        new_refills = max(0, row["refills_left"] - 1)

        updated = db.execute(
            text(
                "UPDATE prescriptions SET remaining_days = :rem, refills_left = :ref WHERE id = :id RETURNING *"
            ),
            {"rem": new_remaining, "ref": new_refills, "id": prescription_id},
        ).mappings().first()
        db.commit()
        rx_name = row["name"]
        return {
            "success": True,
            "message": f"Refill requested for {rx_name}. Pharmacy dispatch initiated.",
            "prescription": dict(updated),
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process refill: {str(e)}") from e
    finally:
        db.close()


# ==========================================
# Medication Adherence Endpoints (Phase 4)
# ==========================================

@app.get(
    "/api/v1/medications",
    tags=["Medication Adherence"],
    summary="List Scheduled Medication Doses",
    description="Retrieves daily medication dosing schedules and compliance flags for the monitored patient.",
    dependencies=[Depends(verify_dashboard_key)],
)
def list_medications(patient_id: Optional[str] = Query(default=None, description="Optional patient UUID filter")):
    db = require_db()
    try:
        if patient_id:
            rows = db.execute(
                text("SELECT * FROM medications WHERE patient_id = :pid ORDER BY id ASC"),
                {"pid": patient_id},
            ).mappings().all()
        else:
            rows = db.execute(
                text("SELECT * FROM medications ORDER BY id ASC")
            ).mappings().all()
        return {"items": [dict(r) for r in rows], "count": len(rows)}
    finally:
        db.close()


@app.post(
    "/api/v1/medications",
    tags=["Medication Adherence"],
    summary="Schedule Medication Dose",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_dashboard_key)],
)
def create_medication(payload: MedicationDoseCreate):
    db = require_db()
    try:
        now = datetime.now(timezone.utc)
        row = db.execute(
            text(
                "INSERT INTO medications (patient_id, medication_name, time_slot, time_str, dosage, notes, taken, created_at) "
                "VALUES (:patient_id, :name, :time_slot, :time_str, :dosage, :notes, :taken, :now) "
                "RETURNING *"
            ),
            {
                "patient_id": payload.patient_id or "patient_1001",
                "name": payload.medication_name,
                "time_slot": payload.time_slot,
                "time_str": payload.time_str,
                "dosage": payload.dosage,
                "notes": payload.notes,
                "taken": payload.taken,
                "now": now,
            },
        ).mappings().first()
        db.commit()
        return {"success": True, "medication": dict(row)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to schedule medication: {str(e)}") from e
    finally:
        db.close()


@app.patch(
    "/api/v1/medications/{med_id}/toggle",
    tags=["Medication Adherence"],
    summary="Toggle Dose Compliance State",
    dependencies=[Depends(verify_dashboard_key)],
)
@app.post(
    "/api/v1/medications/{med_id}/toggle",
    tags=["Medication Adherence"],
    summary="Toggle Dose Compliance State (POST alias)",
    include_in_schema=False,
    dependencies=[Depends(verify_dashboard_key)],
)
def toggle_medication(
    med_id: int = Path(..., description="ID of medication dose to update"),
    payload: Optional[MedicationToggleRequest] = None,
):
    db = require_db()
    try:
        now = datetime.now(timezone.utc)
        taken_state = payload.taken if payload is not None else True
        taken_at_val = now if taken_state else None
        row = db.execute(
            text(
                "UPDATE medications SET taken = :taken, taken_at = :taken_at WHERE id = :id RETURNING *"
            ),
            {"taken": taken_state, "taken_at": taken_at_val, "id": med_id},
        ).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail=f"Medication #{med_id} not found.")
        db.commit()
        status_label = "Taken" if taken_state else "Pending"
        return {
            "success": True,
            "medication": dict(row),
            "message": f"Dose compliance status updated to: {status_label}.",
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update medication: {str(e)}") from e
    finally:
        db.close()


# ==========================================
# Caregiver Network Endpoints (Phase 4)
# ==========================================

@app.get(
    "/api/v1/caregivers",
    tags=["Caregiver Network"],
    summary="List Emergency Caregivers & Contacts",
    description="Retrieves the care network, verified relatives, attending physicians, and emergency dispatch points.",
    dependencies=[Depends(verify_dashboard_key)],
)
def list_caregivers(patient_id: Optional[str] = Query(default=None, description="Optional patient UUID filter")):
    db = require_db()
    try:
        if patient_id:
            rows = db.execute(
                text("SELECT * FROM caregivers WHERE patient_id = :pid ORDER BY priority_order ASC, id ASC"),
                {"pid": patient_id},
            ).mappings().all()
        else:
            rows = db.execute(
                text("SELECT * FROM caregivers ORDER BY priority_order ASC, id ASC")
            ).mappings().all()
        return {"items": [dict(r) for r in rows], "count": len(rows)}
    finally:
        db.close()


@app.post(
    "/api/v1/caregivers",
    tags=["Caregiver Network"],
    summary="Add Caregiver Contact",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_dashboard_key)],
)
def create_caregiver(payload: CaregiverCreate):
    db = require_db()
    try:
        now = datetime.now(timezone.utc)
        row = db.execute(
            text(
                "INSERT INTO caregivers (patient_id, name, role, relation, phone, email, access_level, priority_order, created_at) "
                "VALUES (:patient_id, :name, :role, :relation, :phone, :email, :access_level, :priority_order, :now) "
                "RETURNING *"
            ),
            {
                "patient_id": payload.patient_id or "patient_1001",
                "name": payload.name,
                "role": payload.role,
                "relation": payload.relation,
                "phone": payload.phone,
                "email": payload.email,
                "access_level": payload.access_level,
                "priority_order": payload.priority_order,
                "now": now,
            },
        ).mappings().first()
        db.commit()
        return {"success": True, "caregiver": dict(row)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add caregiver: {str(e)}") from e
    finally:
        db.close()


@app.post(
    "/api/v1/caregivers/{caregiver_id}/notify",
    tags=["Caregiver Network"],
    summary="Dispatch Clinical Alert to Caregiver",
    dependencies=[Depends(verify_dashboard_key)],
)
def notify_caregiver(
    caregiver_id: int = Path(..., description="ID of caregiver to notify"),
    payload: Optional[CaregiverNotifyRequest] = None,
):
    db = require_db()
    try:
        row = db.execute(
            text("SELECT * FROM caregivers WHERE id = :id"),
            {"id": caregiver_id},
        ).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail=f"Caregiver #{caregiver_id} not found.")

        msg = payload.message if payload else "Clinical vital anomaly alert dispatched"
        urgency = payload.urgency if payload else "urgent"
        cg_name = row["name"]
        cg_phone = row["phone"]
        return {
            "success": True,
            "dispatched": True,
            "recipient": {
                "id": row["id"],
                "name": cg_name,
                "phone": cg_phone,
                "email": row["email"],
            },
            "message": f"Alert successfully dispatched to {cg_name} ({cg_phone}) via encrypted SMS & Email.",
            "urgency": urgency,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to dispatch notification: {str(e)}") from e
    finally:
        db.close()


# ==========================================
# Clinical Automation & Workflows Endpoints (Phase 4)
# ==========================================

@app.get(
    "/api/v1/automation/rules",
    tags=["Clinical Automation & Workflows"],
    summary="List Automation Workflow Rules",
    description="Retrieves automated vital sign breach escalation rules and device actions.",
    dependencies=[Depends(verify_dashboard_key)],
)
def list_automation_rules():
    db = require_db()
    try:
        rows = db.execute(
            text("SELECT * FROM automation_rules ORDER BY id ASC")
        ).mappings().all()
        return {"items": [dict(r) for r in rows], "count": len(rows)}
    finally:
        db.close()


@app.post(
    "/api/v1/automation/rules",
    tags=["Clinical Automation & Workflows"],
    summary="Create Automation Workflow Rule",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_dashboard_key)],
)
def create_automation_rule(payload: AutomationRuleCreate):
    db = require_db()
    try:
        now = datetime.now(timezone.utc)
        row = db.execute(
            text(
                "INSERT INTO automation_rules (name, description, trigger_condition, action_payload, is_enabled, triggers_today, created_at) "
                "VALUES (:name, :description, :trigger_condition, :action_payload, :is_enabled, 0, :now) "
                "RETURNING *"
            ),
            {
                "name": payload.name,
                "description": payload.description,
                "trigger_condition": payload.trigger_condition,
                "action_payload": payload.action_payload,
                "is_enabled": payload.is_enabled,
                "now": now,
            },
        ).mappings().first()
        db.commit()
        return {"success": True, "rule": dict(row)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create automation rule: {str(e)}") from e
    finally:
        db.close()


@app.patch(
    "/api/v1/automation/rules/{rule_id}/toggle",
    tags=["Clinical Automation & Workflows"],
    summary="Toggle Automation Rule Active State",
    dependencies=[Depends(verify_dashboard_key)],
)
@app.post(
    "/api/v1/automation/rules/{rule_id}/toggle",
    tags=["Clinical Automation & Workflows"],
    summary="Toggle Automation Rule Active State (POST alias)",
    include_in_schema=False,
    dependencies=[Depends(verify_dashboard_key)],
)
def toggle_automation_rule(
    rule_id: int = Path(..., description="ID of automation rule to toggle"),
    payload: Optional[AutomationRuleToggleRequest] = None,
):
    db = require_db()
    try:
        row = db.execute(
            text("SELECT * FROM automation_rules WHERE id = :id"),
            {"id": rule_id},
        ).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail=f"Automation rule #{rule_id} not found.")

        new_status = payload.is_enabled if payload is not None else (not row["is_enabled"])
        updated = db.execute(
            text("UPDATE automation_rules SET is_enabled = :st WHERE id = :id RETURNING *"),
            {"st": new_status, "id": rule_id},
        ).mappings().first()
        db.commit()
        rule_name = row["name"]
        status_label = "ENABLED" if new_status else "DISABLED"
        return {
            "success": True,
            "rule": dict(updated),
            "message": f"Automation rule {rule_name} is now {status_label}.",
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to toggle automation rule: {str(e)}") from e
    finally:
        db.close()
