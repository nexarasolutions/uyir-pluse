CREATE TABLE IF NOT EXISTS measurements (
 id BIGSERIAL PRIMARY KEY, device_id TEXT NOT NULL, patient_id TEXT,
 measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), heart_rate_bpm DOUBLE PRECISION,
 spo2_percent DOUBLE PRECISION, temperature_c DOUBLE PRECISION,
 sensor_quality TEXT NOT NULL DEFAULT 'unknown', data_quality_status TEXT NOT NULL DEFAULT 'unknown'
);
CREATE INDEX IF NOT EXISTS idx_measurements_device_time ON measurements(device_id, measured_at DESC);
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
