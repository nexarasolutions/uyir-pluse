from pydantic import BaseModel, Field
from typing import Optional, Literal

class MeasurementIn(BaseModel):
    device_id: str
    patient_id: Optional[str] = None
    heart_rate_bpm: Optional[float] = None
    spo2_percent: Optional[float] = None
    temperature_c: Optional[float] = None
    sensor_quality: Literal["good", "fair", "poor", "unknown"] = "unknown"

class AnalysisRequest(BaseModel):
    heart_rate_bpm: Optional[float] = Field(None, example=75.0)
    spo2_percent: Optional[float] = Field(None, example=98.0)
    temperature_c: Optional[float] = Field(None, example=36.7)
    # Optional 5-feature vital signs for AI models
    ecg: Optional[float] = Field(None, example=0.12)
    bp_systolic: Optional[float] = Field(None, example=120.0)
    bp_diastolic: Optional[float] = Field(None, example=80.0)
