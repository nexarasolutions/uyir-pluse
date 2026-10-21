from pydantic import BaseModel, Field
from typing import Optional, Literal

class MeasurementIn(BaseModel):
    device_id: str = Field(..., description="Unique hardware identifier of the IoT sensor node", examples=["esp32_device_01"])
    patient_id: Optional[str] = Field(None, description="Identifier of the monitored patient", examples=["patient_1001"])
    heart_rate_bpm: Optional[float] = Field(None, description="Measured heart rate in beats per minute", examples=[75.0])
    spo2_percent: Optional[float] = Field(None, description="Blood oxygen saturation percentage", examples=[98.5])
    temperature_c: Optional[float] = Field(None, description="Body temperature in Celsius", examples=[36.6])
    sensor_quality: Literal["good", "fair", "poor", "unknown"] = Field("unknown", description="Sensor signal stability and contact quality", examples=["good"])

class AnalysisRequest(BaseModel):
    heart_rate_bpm: Optional[float] = Field(None, description="Heart rate in beats per minute", examples=[75.0])
    spo2_percent: Optional[float] = Field(None, description="Blood oxygen saturation (SpO2 %)", examples=[98.0])
    temperature_c: Optional[float] = Field(None, description="Body temperature in Celsius", examples=[36.7])
    # 5-feature vital signs for AI models
    ecg: Optional[float] = Field(None, description="Electrocardiogram (ECG) normalized reading", examples=[0.12])
    bp_systolic: Optional[float] = Field(None, description="Systolic blood pressure (mmHg)", examples=[120.0])
    bp_diastolic: Optional[float] = Field(None, description="Diastolic blood pressure (mmHg)", examples=[80.0])
