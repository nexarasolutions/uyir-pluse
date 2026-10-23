CREATE TABLE IF NOT EXISTS measurements (
 id BIGSERIAL PRIMARY KEY, device_id TEXT NOT NULL, patient_id TEXT,
 measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), heart_rate_bpm DOUBLE PRECISION,
 spo2_percent DOUBLE PRECISION, temperature_c DOUBLE PRECISION,
 sensor_quality TEXT NOT NULL DEFAULT 'unknown', data_quality_status TEXT NOT NULL DEFAULT 'unknown'
);
CREATE INDEX IF NOT EXISTS idx_measurements_device_time ON measurements(device_id, measured_at DESC);

CREATE TABLE IF NOT EXISTS patient_vitals (
 id BIGSERIAL PRIMARY KEY, device_id TEXT NOT NULL,
 heart_rate REAL, spo2 REAL, temperature REAL,
 recorded_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_analysis (
 id BIGSERIAL PRIMARY KEY, measurement_id BIGINT REFERENCES measurements(id) ON DELETE SET NULL,
 device_id TEXT NOT NULL, analysed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), result TEXT NOT NULL,
 anomaly_score DOUBLE PRECISION, explanation TEXT NOT NULL, model_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
 id BIGSERIAL PRIMARY KEY, device_id TEXT NOT NULL, measurement_id BIGINT REFERENCES measurements(id) ON DELETE SET NULL,
 alert_type TEXT NOT NULL, severity TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open',
 triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), acknowledged_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_alerts_status_time ON alerts(status, triggered_at DESC);

-- Profiles table linked to Supabase Auth users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'patient',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all tables are visible and accessible in Supabase Table Editor & APIs
ALTER TABLE measurements DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis DISABLE ROW LEVEL SECURITY;
ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE patient_vitals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;



-- Phase 3: Additive SQL Migration for Care & Automation
-- Tables: prescriptions, medications, caregivers, automation_rules

CREATE TABLE IF NOT EXISTS prescriptions (
    id BIGSERIAL PRIMARY KEY,
    patient_id TEXT DEFAULT 'patient_1001',
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    doctor TEXT NOT NULL,
    remaining_days INTEGER NOT NULL DEFAULT 30,
    total_days INTEGER NOT NULL DEFAULT 30,
    refills_left INTEGER NOT NULL DEFAULT 1,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medications (
    id BIGSERIAL PRIMARY KEY,
    patient_id TEXT DEFAULT 'patient_1001',
    medication_name TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    time_str TEXT NOT NULL,
    dosage TEXT NOT NULL,
    notes TEXT,
    taken BOOLEAN NOT NULL DEFAULT FALSE,
    taken_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS caregivers (
    id BIGSERIAL PRIMARY KEY,
    patient_id TEXT DEFAULT 'patient_1001',
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    relation TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    access_level TEXT NOT NULL DEFAULT 'Full Clinical & Alerts',
    priority_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_rules (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    trigger_condition TEXT NOT NULL,
    action_payload TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    triggers_today INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all tables are visible and accessible in Supabase Table Editor & APIs
ALTER TABLE IF EXISTS prescriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS medications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS caregivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS automation_rules DISABLE ROW LEVEL SECURITY;
