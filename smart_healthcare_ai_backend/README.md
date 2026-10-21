# Smart Healthcare Monitoring — AI + FastAPI Starter

Educational prototype for ESP32-C3, MAX30102 and DS18B20. NOT a certified medical device and not for diagnosis or treatment decisions.

## Step 1: Train the ML model
1. Install Python 3.11+ and run `pip install -r requirements.txt`.
2. Prepare a CSV with columns `heart_rate_bpm,spo2_percent,temperature_c` and at least 100 valid rows.
3. Run `python ml/train_model.py --csv data/vitals.csv`.
4. The model is saved as `models/isolation_forest.joblib`.

Use real, lawfully obtained, de-identified data or clearly labelled simulated data for software tests. Do not report simulated-data performance as clinical accuracy. Isolation Forest detects statistical outliers; it is not a medical diagnostic model.

## Step 2: Configure and run backend
1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL`, `DEVICE_API_KEY`, `DASHBOARD_API_KEY`.
3. Run `sql/schema.sql` in Supabase SQL Editor.
4. Install dependencies: `pip install -r requirements.txt`.
5. Run `uvicorn app.main:app --reload`.
6. Open `http://127.0.0.1:8000/docs`.

## APIs
- `GET /health`
- `GET /api/v1/model/status`
- `POST /api/v1/measurements` with `X-Device-Key`
- `GET /api/v1/devices/{device_id}/latest` with `X-Dashboard-Key`
- `GET /api/v1/devices/{device_id}/history?limit=100`
- `POST /api/v1/devices/{device_id}/analyze`
- `GET /api/v1/alerts?limit=100`

Example ESP32 JSON:
```json
{"device_id":"esp32c3-001","patient_id":"demo-patient-001","heart_rate_bpm":76.0,"spo2_percent":98.0,"temperature_c":36.7,"sensor_quality":"good"}
```
Send `null` for unavailable readings; never fabricate zero values. Use HTTPS when deployed. Keep `.env` private and never place secrets in browser code.

The API is a starter and needs configuration/testing before deployment. Medical thresholds, sensor quality handling and model performance require clinical validation.
