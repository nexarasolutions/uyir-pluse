# Smart Healthcare Monitoring — AI + FastAPI Starter

Educational prototype for ESP32-C3, MAX30102 and DS18B20. NOT a certified medical device and not for diagnosis or treatment decisions.

## Step 1: Train the ML model
1. Install Python 3.11+ and run `pip install -r requirements.txt`.
2. Prepare a CSV with columns `heart_rate_bpm,spo2_percent,temperature_c` and at least 100 valid rows.
3. Run `python ml/train_model.py --csv data/vitals.csv`.
4. The model is saved as `models/isolation_forest.joblib`.

Use real, lawfully obtained, de-identified data or clearly labelled simulated data for software tests. Do not report simulated-data performance as clinical accuracy. Isolation Forest detects statistical outliers; it is not a medical diagnostic model.

## Step 2: Configure and run backend
1. Copy `.env.example` to `.env` or verify `.env`.
2. Ensure `DATABASE_URL`, `DEVICE_API_KEY`, `DASHBOARD_API_KEY`, `SUPABASE_URL`, and `JWT_SECRET` are set.
3. Run `sql/schema.sql` in Supabase SQL Editor to initialize tables (`measurements`, `ai_analysis`, `alerts`, `patient_vitals`, `public.profiles`).
4. Install dependencies: `pip install -r requirements.txt`.
5. Run server:
   ```bash
   cd smart_healthcare_ai_backend
   uvicorn app.main:app --reload
   ```
6. Open Swagger UI at `http://127.0.0.1:8000/docs`.

## APIs & Swagger Testing

### 🔐 Authentication (Supabase Auth)
- `POST /api/v1/auth/signup` — Create user account with Supabase Auth (`doctor`, `patient`, `nurse`, `admin`).
- `POST /api/v1/auth/login` — Sign in with email & password, receive Supabase JWT access token.
- `GET /api/v1/auth/me` — Retrieve active user profile (`Authorization: Bearer <token>`).
- `POST /api/v1/auth/refresh` — Refresh active JWT session token.
- `POST /api/v1/auth/logout` — Terminate active session.
- `POST /api/v1/auth/reset-password` — Dispatch password reset request.

### 🩺 Clinical & IoT Telemetry
- `GET /health` & `GET /ready` — Service liveness and Supabase database readiness.
- `GET /api/v1/model/status` — Multi-model AI ensemble architecture inspection.
- `POST /api/v1/measurements` — Ingest IoT hardware telemetry (ESP32) with automatic AI screening.
- `GET /api/v1/devices/{device_id}/latest` — Latest vital signs reading for hardware node.
- `GET /api/v1/devices/{device_id}/history?limit=100` — Longitudinal patient vitals stream.
- `POST /api/v1/devices/{device_id}/analyze` — Multi-model AI anomaly screening (Isolation Forest + SVM + Autoencoder) and Supabase persistence.
- `GET /api/v1/alerts?limit=100` — Clinical anomaly alerts and threshold breach triage.

### 💡 Swagger Authorize 🔒
In Swagger UI (`/docs`), click **Authorize 🔒** and select either:
1. **BearerAuth (http, Bearer):** Paste the JWT access token from `/api/v1/auth/login`.
2. **ApiKeyAuth (X-API-Key):** Enter Device Key or Dashboard Key.
3. In `development` mode, endpoints can also be executed directly without credentials.
