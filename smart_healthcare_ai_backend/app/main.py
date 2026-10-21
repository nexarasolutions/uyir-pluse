from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, Query, status
from sqlalchemy import text
from app.config import settings
from app.db import require_db
from app.schemas import MeasurementIn, AnalysisRequest
from app.security import verify_device_key, verify_dashboard_key
from app.analysis import analyze_values, get_models_status

tags_metadata = [
    {
        "name": "System & Diagnostics",
        "description": "Liveness probes, system readiness checks, and service discovery endpoints.",
    },
    {
        "name": "AI Anomaly Screening",
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
]

app_description = """
# 🩺 Uyir+ Smart Healthcare AI Monitoring Platform

Enterprise-grade IoT vital sign ingestion, multi-model AI anomaly screening, and clinical alert orchestration.

---

### 🚀 Core Architecture
* **Real-time IoT Ingestion:** Continuous vital sign streaming from wearable edge hardware.
* **Triple-Ensemble AI Engine:**
  * **Isolation Forest:** Statistical outlier and distribution boundary detection.
  * **One-Class SVM:** Non-linear kernel boundary separation.
  * **Deep PyTorch Autoencoder:** Reconstruction error Mean Squared Error (MSE) anomaly scoring.
* **Resilient Cloud Persistence:** Low-latency storage backed by Supabase PostgreSQL with automated connection pooling.

---

### 🔐 Authentication
* **Clinical & Dashboard Gateway:** Provide `x-dashboard-key`, `x-api-key`, or `Authorization: Bearer <key>`.
* **Hardware Ingestion Gateway:** Provide `x-device-key`, `x-api-key`, or `Authorization: Bearer <key>`.

*Click **Authorize 🔒** at the top right to authenticate your session across all endpoints.*
"""

app = FastAPI(
    title=settings.app_name,
    version="2.0.0",
    description=app_description,
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.get(
    "/",
    tags=["System & Diagnostics"],
    summary="Platform Service Directory",
    description="Returns high-level system metadata, API documentation links, and primary service routes.",
)
def root():
    return {
        "platform": settings.app_name,
        "version": "2.0.0",
        "status": "operational",
        "documentation": "/docs",
        "redoc": "/redoc",
        "health": "/health",
        "readiness": "/ready",
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


@app.get(
    "/api/v1/model/status",
    tags=["AI Anomaly Detection"],
    summary="Inspect AI Models & Architecture Specs",
    description="Reports model availability, memory footprint status, architecture parameters, and feature dimensions across Isolation Forest, One-Class SVM, and PyTorch Autoencoder.",
)
def model_status():
    return get_models_status()


@app.post(
    "/api/v1/measurements",
    tags=["Device Telemetry"],
    summary="Ingest Patient Vital Signs from IoT Edge Device",
    description="Receives real-time telemetry from edge sensors (Heart Rate, SpO2, Temperature, Signal Quality) and persists records to the PostgreSQL datastore.",
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
    try:
        row = db.execute(
            text(
                "INSERT INTO measurements(device_id,patient_id,heart_rate_bpm,spo2_percent,temperature_c,sensor_quality,data_quality_status) "
                "VALUES (:device,:patient,:hr,:spo2,:temp,:quality,:dq) "
                "RETURNING id,device_id,patient_id,measured_at,heart_rate_bpm,spo2_percent,temperature_c,sensor_quality,data_quality_status"
            ),
            {
                "device": payload.device_id,
                "patient": payload.patient_id,
                "hr": payload.heart_rate_bpm,
                "spo2": payload.spo2_percent,
                "temp": payload.temperature_c,
                "quality": payload.sensor_quality,
                "dq": quality,
            },
        ).mappings().one()
        db.commit()
        return dict(row)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist telemetry reading; please verify database connectivity.",
        ) from e
    finally:
        db.close()


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


@app.post(
    "/api/v1/devices/{device_id}/analyze",
    tags=["AI Anomaly Detection"],
    summary="Execute Multi-Model AI Vital Signs Anomaly Analysis",
    description="Evaluates patient vitals using an ensemble of Isolation Forest, One-Class SVM, and PyTorch Autoencoder to screen for physiological anomalies.",
    dependencies=[Depends(verify_dashboard_key)],
)
def analyze(device_id: str, payload: AnalysisRequest):
    result = analyze_values(
        hr=payload.heart_rate_bpm,
        spo2=payload.spo2_percent,
        temp=payload.temperature_c,
        ecg=payload.ecg,
        bp_systolic=payload.bp_systolic,
        bp_diastolic=payload.bp_diastolic,
    )
    result["device_id"] = device_id
    return result


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
