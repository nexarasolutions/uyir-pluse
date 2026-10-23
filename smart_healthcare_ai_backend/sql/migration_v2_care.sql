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
