# 🏥 UYIR PLUS — Smart Healthcare AI Platform

> **Real-Time Remote Patient Monitoring & Multi-Model AI Physiological Anomaly Detection Platform**

[![Backend Status](https://img.shields.io/badge/Backend-Render%20Online-brightgreen)](https://uyir-pluse.onrender.com/ready)
[![Frontend Status](https://img.shields.io/badge/Frontend-Next.js%2014-blue)](#frontend-deployment-vercel)
[![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](#)

---

## 📁 Monorepo Architecture

```
uyir-plus/
├── frontend/                          # Next.js 14 App Router, React 18, TypeScript, TailwindCSS
│   ├── app/                           # App routing (dashboard, modules, auth)
│   ├── components/                    # Glassmorphism UI components & modules
│   ├── lib/                           # Typed API client with auto JWT & Supabase auth
│   ├── public/                        # Static assets & icons
│   ├── package.json                   # Dependencies lockfile
│   └── next.config.mjs                # Next.js production configuration
├── smart_healthcare_ai_backend/       # Production Python FastAPI Backend
│   ├── app/                           # FastAPI routes, schemas, auth, and database pool
│   ├── ml/                            # Model training & preprocessing
│   ├── models/                        # Pre-trained ML weights (Isolation Forest, SVM, Autoencoder)
│   ├── sql/                           # Supabase PostgreSQL DDL & migrations
│   ├── tests/                         # Pytest automated test suite
│   ├── requirements.txt               # Production Python dependencies
│   └── runtime.txt                    # Python 3.11/3.9 specification
├── models/                            # Root pre-trained model backups
├── README.md                          # Platform documentation
└── .gitignore                         # Comprehensive secrets & build artifact exclusions
```

---

## 🚀 Live Deployments

- **Production Backend (Render):** [`https://uyir-pluse.onrender.com`](https://uyir-pluse.onrender.com)
- **Interactive Swagger Docs:** [`https://uyir-pluse.onrender.com/docs`](https://uyir-pluse.onrender.com/docs)
- **Frontend Target (Vercel):** Connected via `NEXT_PUBLIC_API_BASE_URL=https://uyir-pluse.onrender.com`

---

## 🛠️ Local Development

### 1. Frontend Setup (Next.js)
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:3000
```

### 2. Backend Setup (FastAPI)
```bash
cd smart_healthcare_ai_backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# Running on http://localhost:8000
```

### 3. Run Automated Tests
```bash
cd smart_healthcare_ai_backend
pytest -v
```

---

## 🔒 Security & Privacy Governance
- Strictly excludes `.env`, `.env.local`, passwords, and connection strings from Git.
- Multi-tenant Row-Level Security (RLS) enforcement via Supabase PostgreSQL.
- Dual-scheme authentication: Supabase JWT Bearer Tokens & cryptographic `X-API-Key` headers.
- Automatic CORS whitelisting supporting `localhost`, development tunnels, and `*.vercel.app`.
