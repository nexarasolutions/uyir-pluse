from pydantic import BaseModel, Field
from typing import Optional, Literal

class MeasurementIn(BaseModel):
    device_id: str = Field(..., description="Unique hardware identifier of the IoT sensor node", examples=["esp32_device_01"])
    patient_id: Optional[str] = Field(None, description="Identifier of the monitored patient", examples=["patient_1001"])
    heart_rate_bpm: Optional[float] = Field(None, description="Measured heart rate in beats per minute", examples=[75.0])
    spo2_percent: Optional[float] = Field(None, description="Blood oxygen saturation percentage", examples=[98.5])
    temperature_c: Optional[float] = Field(None, description="Body temperature in Celsius", examples=[36.6])
    sensor_quality: Literal["good", "fair", "poor", "unknown"] = Field("good", description="Sensor signal stability and contact quality", examples=["good"])
    ecg: Optional[float] = Field(None, description="Optional Electrocardiogram (ECG) reading", examples=[0.12])
    bp_systolic: Optional[float] = Field(None, description="Optional Systolic blood pressure (mmHg)", examples=[120.0])
    bp_diastolic: Optional[float] = Field(None, description="Optional Diastolic blood pressure (mmHg)", examples=[80.0])

class AnalysisRequest(BaseModel):
    patient_id: Optional[str] = Field(None, description="Identifier of the monitored patient", examples=["patient_1001"])
    heart_rate_bpm: Optional[float] = Field(None, description="Heart rate in beats per minute", examples=[75.0])
    spo2_percent: Optional[float] = Field(None, description="Blood oxygen saturation (SpO2 %)", examples=[98.0])
    temperature_c: Optional[float] = Field(None, description="Body temperature in Celsius", examples=[36.7])
    # 5-feature vital signs for AI models
    ecg: Optional[float] = Field(None, description="Electrocardiogram (ECG) normalized reading", examples=[0.12])
    bp_systolic: Optional[float] = Field(None, description="Systolic blood pressure (mmHg)", examples=[120.0])
    bp_diastolic: Optional[float] = Field(None, description="Diastolic blood pressure (mmHg)", examples=[80.0])


# ==========================================
# Supabase Authentication Schemas
# ==========================================

class UserSignUp(BaseModel):
    email: str = Field(..., description="User email address for account registration", examples=["doctor.sharma@hospital.org"])
    password: str = Field(..., min_length=6, description="Account password (minimum 6 characters)", examples=["SecurePass123!"])
    full_name: Optional[str] = Field(None, description="Full name of clinician, nurse, or patient", examples=["Dr. Sharma"])
    role: Literal["doctor", "patient", "nurse", "admin"] = Field("patient", description="User role in the healthcare system", examples=["doctor"])

class UserLogin(BaseModel):
    email: str = Field(..., description="Registered email address", examples=["doctor.sharma@hospital.org"])
    password: str = Field(..., description="Account password", examples=["SecurePass123!"])

class UserOut(BaseModel):
    id: str = Field(..., description="Unique Supabase UUID")
    email: str = Field(..., description="User email address")
    full_name: Optional[str] = Field(None, description="Full name")
    role: str = Field("patient", description="Account role")
    created_at: Optional[str] = Field(None, description="Timestamp user was created")
    last_sign_in_at: Optional[str] = Field(None, description="Timestamp of last login")

class TokenResponse(BaseModel):
    access_token: str = Field(..., description="Supabase-compatible JWT Bearer Token")
    token_type: str = Field("bearer", description="Token type")
    expires_in: int = Field(604800, description="Token lifetime in seconds (7 days)")
    user: UserOut = Field(..., description="Authenticated user profile")

class PasswordResetRequest(BaseModel):
    email: str = Field(..., description="Email address for password recovery", examples=["doctor.sharma@hospital.org"])

class MessageResponse(BaseModel):
    message: str
    success: bool = True
