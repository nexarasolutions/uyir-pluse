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

