from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy import text
from app.config import settings
from app.db import require_db
from app.schemas import MeasurementIn, AnalysisRequest
from app.security import verify_device_key, verify_dashboard_key
from app.analysis import analyze_values, get_models_status

app = FastAPI(title=settings.app_name, version="1.0.0", description="Educational prototype; not a medical device.")

@app.get("/")
def root():
    return {
        "message": "Smart Healthcare Monitoring API is running",
        "docs": "/docs",
        "health": "/health",
        "model_status": "/api/v1/model/status"
    }

@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}

@app.get("/api/v1/model/status")
def model_status():
    """Reports loading and feature expectations for all three trained models."""
    return get_models_status()

@app.post("/api/v1/measurements", dependencies=[Depends(verify_device_key)])
def create_measurement(payload: MeasurementIn):
    db = require_db()
    quality = "valid" if all(v is not None for v in [payload.heart_rate_bpm, payload.spo2_percent, payload.temperature_c]) and payload.sensor_quality == "good" else "incomplete_or_poor"
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
                "dq": quality
            }
        ).mappings().one()
        db.commit()
        return dict(row)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not save measurement; check database schema and connection.") from e
    finally:
        db.close()

@app.get("/api/v1/devices/{device_id}/latest", dependencies=[Depends(verify_dashboard_key)])
def latest(device_id: str):
    db = require_db()
    try:
        row = db.execute(
            text("SELECT id,device_id,patient_id,measured_at,heart_rate_bpm,spo2_percent,temperature_c,sensor_quality,data_quality_status FROM measurements WHERE device_id=:device ORDER BY measured_at DESC LIMIT 1"),
            {"device": device_id}
        ).mappings().first()
        if row is None:
            raise HTTPException(status_code=404, detail="No readings for device")
        return dict(row)
    finally:
        db.close()

@app.get("/api/v1/devices/{device_id}/history", dependencies=[Depends(verify_dashboard_key)])
def history(device_id: str, limit: int = Query(default=100, ge=1, le=1000)):
    db = require_db()
    try:
        rows = db.execute(
            text("SELECT id,device_id,patient_id,measured_at,heart_rate_bpm,spo2_percent,temperature_c,sensor_quality,data_quality_status FROM measurements WHERE device_id=:device ORDER BY measured_at DESC LIMIT :lim"),
            {"device": device_id, "lim": limit}
        ).mappings().all()
        return {"items": [dict(r) for r in rows], "count": len(rows)}
    finally:
        db.close()

@app.post("/api/v1/devices/{device_id}/analyze", dependencies=[Depends(verify_dashboard_key)])
def analyze(device_id: str, payload: AnalysisRequest):
    result = analyze_values(
        hr=payload.heart_rate_bpm,
        spo2=payload.spo2_percent,
        temp=payload.temperature_c,
        ecg=payload.ecg,
        bp_systolic=payload.bp_systolic,
        bp_diastolic=payload.bp_diastolic
    )
    result["device_id"] = device_id
    return result

@app.get("/api/v1/alerts", dependencies=[Depends(verify_dashboard_key)])
def alerts(limit: int = Query(default=100, ge=1, le=1000)):
    db = require_db()
    try:
        rows = db.execute(
            text("SELECT id,device_id,measurement_id,alert_type,severity,reason,status,triggered_at,acknowledged_at FROM alerts ORDER BY triggered_at DESC LIMIT :lim"),
            {"lim": limit}
        ).mappings().all()
        return {"items": [dict(r) for r in rows], "count": len(rows)}
    finally:
        db.close()
