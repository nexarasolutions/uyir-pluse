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

# ==========================================
# Alert & Care Schemas (Phase 2 & 4)
# ==========================================

class SosAlertRequest(BaseModel):
    device_id: str = Field("esp32_device_01", description="Unique hardware identifier or sender ID")
    patient_id: Optional[str] = Field(None, description="Patient identifier")
    severity: Literal["critical", "warning", "info"] = Field("critical", description="Alert severity level")
    reason: str = Field("Emergency SOS manually triggered from clinical dashboard", description="Incident description")
    location: Optional[str] = Field("Patient Room / Home", description="Incident location")

class AlertAcknowledgeResponse(BaseModel):
    success: bool = True
    alert_id: int
    status: str
    acknowledged_at: str
    message: str

class PrescriptionCreate(BaseModel):
    patient_id: Optional[str] = Field("patient_1001", description="Patient identifier")
    name: str = Field(..., description="Medication name", examples=["Atorvastatin"])
    dosage: str = Field(..., description="Dosage amount", examples=["20mg"])
    frequency: str = Field("Once daily at bedtime", description="Frequency instructions")
    doctor: str = Field("Dr. Sharma", description="Prescribing physician")
    remaining_days: int = Field(24, description="Remaining supply days")
    total_days: int = Field(30, description="Total supply days")
    refills_left: int = Field(2, description="Remaining refills")
    instructions: Optional[str] = Field("Take after dinner with water", description="Special instructions")

class PrescriptionRefillRequest(BaseModel):
    refills_added: int = Field(1, description="Number of refills to add")

class MedicationDoseCreate(BaseModel):
    patient_id: Optional[str] = Field("patient_1001", description="Patient identifier")
    medication_name: str = Field(..., description="Medication name", examples=["Metformin"])
    time_slot: str = Field("Morning", description="Time slot e.g. Morning, Afternoon, Evening, Night")
    time_str: str = Field("08:00 AM", description="Display time string")
    dosage: str = Field("500mg", description="Dosage")
    notes: Optional[str] = Field("With meal", description="Administration notes")
    taken: bool = Field(False, description="Whether dose was administered")

class MedicationToggleRequest(BaseModel):
    taken: bool = Field(..., description="New taken status")

class CaregiverCreate(BaseModel):
    patient_id: Optional[str] = Field("patient_1001", description="Patient identifier")
    name: str = Field(..., description="Caregiver full name", examples=["Sarah Jenkins"])
    role: str = Field("Primary Caregiver", description="Caregiver role")
    relation: str = Field("Daughter", description="Relationship to patient")
    phone: str = Field("+1 (555) 382-9901", description="Phone number")
    email: str = Field("sarah.j@familycare.org", description="Email address")
    access_level: str = Field("Full Clinical & Alerts", description="Permissions level")
    priority_order: int = Field(1, description="Contact priority")

class CaregiverNotifyRequest(BaseModel):
    message: str = Field("Urgent clinical alert update", description="Notification message")
    urgency: str = Field("urgent", description="Urgency level")

class AutomationRuleCreate(BaseModel):
    name: str = Field(..., description="Rule name", examples=["Critical Bradycardia Dispatch"])
    description: str = Field(..., description="Rule description")
    trigger_condition: str = Field(..., description="Condition expression e.g. HR < 45 for 2 min")
    action_payload: str = Field(..., description="Action e.g. SMS to Caregiver + Alarm Tone")
    is_enabled: bool = Field(True, description="Active status")

class AutomationRuleToggleRequest(BaseModel):
    is_enabled: bool = Field(..., description="Enable or disable flag")
