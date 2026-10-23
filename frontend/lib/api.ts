// Typed API access client for UYIR PLUS frontend.
// Connects to verified routes documented by the FastAPI backend on Render.

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://uyir-pluse.onrender.com";
export const API_BASE_URL = RAW_BASE.replace(/\/+$/, "");

export type ApiErrorReason = "unavailable" | "timeout" | "unauthorized" | "validation" | "http";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: ApiErrorReason; status?: number; message: string; details?: unknown };

// ==========================================
// Authentication Token Helpers
// ==========================================

const TOKEN_KEY = "uyir_auth_token";
const USER_KEY = "uyir_auth_user";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ==========================================
// Data Models & Response Types
// ==========================================

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string | null;
  role: "doctor" | "patient" | "nurse" | "admin" | string;
  created_at?: string | null;
  last_sign_in_at?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export interface HealthResponse {
  status: string;
  time: string;
}

export interface ReadinessResponse {
  status: string;
  database: string;
  models: string;
  time: string;
}

export interface ModelDetail {
  loaded: boolean;
  path: string;
  features_expected?: string[];
  input_dim?: number;
  threshold?: number;
  scaler_loaded?: boolean;
}

export interface ModelStatusResponse {
  all_loaded: boolean;
  models: {
    isolation_forest?: ModelDetail;
    one_class_svm?: ModelDetail;
    autoencoder?: ModelDetail;
    [key: string]: ModelDetail | undefined;
  };
}

export interface DeviceTelemetry {
  id: number;
  device_id: string;
  patient_id?: string | null;
  measured_at: string;
  heart_rate_bpm?: number | null;
  spo2_percent?: number | null;
  temperature_c?: number | null;
  sensor_quality?: string;
  data_quality_status?: string;
  ecg?: number | null;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
}

export interface TelemetryHistoryResponse {
  items: DeviceTelemetry[];
  count: number;
}

export interface AlertItem {
  id: number;
  device_id: string;
  measurement_id?: number | null;
  alert_type: string;
  severity: "critical" | "warning" | "info" | string;
  reason: string;
  status: "open" | "acknowledged" | "resolved" | string;
  triggered_at: string;
  acknowledged_at?: string | null;
}

export interface AlertsResponse {
  items: AlertItem[];
  count: number;
}

export interface PrescriptionItem {
  id: number;
  patient_id?: string;
  name: string;
  dosage: string;
  frequency: string;
  doctor: string;
  remaining_days: number;
  total_days: number;
  refills_left: number;
  instructions?: string | null;
  created_at?: string;
}

export interface PrescriptionsResponse {
  items: PrescriptionItem[];
  count: number;
}

export interface MedicationDoseItem {
  id: number;
  patient_id?: string;
  medication_name: string;
  time_slot: "Morning" | "Afternoon" | "Evening" | "Night" | string;
  time_str: string;
  dosage: string;
  notes?: string | null;
  taken: boolean;
  taken_at?: string | null;
  created_at?: string;
}

export interface MedicationsResponse {
  items: MedicationDoseItem[];
  count: number;
}

export interface CaregiverItem {
  id: number;
  patient_id?: string;
  name: string;
  role: string;
  relation: string;
  phone: string;
  email: string;
  access_level: string;
  priority_order: number;
  created_at?: string;
}

export interface CaregiversResponse {
  items: CaregiverItem[];
  count: number;
}

export interface AutomationRuleItem {
  id: number;
  name: string;
  description: string;
  trigger_condition: string;
  action_payload: string;
  is_enabled: boolean;
  triggers_today: number;
  created_at?: string;
}

export interface AutomationRulesResponse {
  items: AutomationRuleItem[];
  count: number;
}

// ==========================================
// HTTP Client Engine
// ==========================================

function parseErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const d = data as Record<string, unknown>;
  if (typeof d.detail === "string") return d.detail;
  if (Array.isArray(d.detail) && d.detail.length > 0) {
    const first = d.detail[0];
    if (first && typeof first === "object" && "msg" in first) {
      return String((first as { msg: unknown }).msg);
    }
  }
  if (typeof d.message === "string") return d.message;
  return fallback;
}

function getAuthHeaders(explicitHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(explicitHeaders ?? {}) };
  const token = getStoredToken();
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiGet<T>(
  path: string,
  options?: { timeoutMs?: number; headers?: Record<string, string> }
): Promise<ApiResult<T>> {
  const timeoutMs = options?.timeoutMs ?? 15000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${cleanPath}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      credentials: "omit",
      headers: {
        Accept: "application/json",
        ...getAuthHeaders(options?.headers),
      },
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, kind: "unauthorized", status: res.status, message: "Authentication required" };
    }

    if (res.status === 422) {
      const errJson = await res.json().catch(() => null);
      const msg = parseErrorMessage(errJson, "Validation error occurred");
      return { ok: false, kind: "validation", status: res.status, message: msg, details: errJson };
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const msg = parseErrorMessage(errJson, `Request failed with HTTP ${res.status}`);
      return { ok: false, kind: "http", status: res.status, message: msg, details: errJson };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return {
      ok: false,
      kind: aborted ? "timeout" : "unavailable",
      message: aborted
        ? "Request timed out while connecting to backend"
        : "Unable to reach the backend service (network error or Render cold start)",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function apiPost<T, B = unknown>(
  path: string,
  body: B,
  options?: { timeoutMs?: number; headers?: Record<string, string> }
): Promise<ApiResult<T>> {
  const timeoutMs = options?.timeoutMs ?? 15000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${cleanPath}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      signal: ctrl.signal,
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...getAuthHeaders(options?.headers),
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, kind: "unauthorized", status: res.status, message: "Authentication required" };
    }

    if (res.status === 422) {
      const errJson = await res.json().catch(() => null);
      const msg = parseErrorMessage(errJson, "Validation error occurred");
      return { ok: false, kind: "validation", status: res.status, message: msg, details: errJson };
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const msg = parseErrorMessage(errJson, `Request failed with HTTP ${res.status}`);
      return { ok: false, kind: "http", status: res.status, message: msg, details: errJson };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return {
      ok: false,
      kind: aborted ? "timeout" : "unavailable",
      message: aborted
        ? "Request timed out while connecting to backend"
        : "Unable to reach the backend service (network error or Render cold start)",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function apiPatch<T, B = unknown>(
  path: string,
  body?: B,
  options?: { timeoutMs?: number; headers?: Record<string, string> }
): Promise<ApiResult<T>> {
  const timeoutMs = options?.timeoutMs ?? 15000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${cleanPath}`;

  try {
    const res = await fetch(url, {
      method: "PATCH",
      signal: ctrl.signal,
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...getAuthHeaders(options?.headers),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, kind: "unauthorized", status: res.status, message: "Authentication required" };
    }

    if (res.status === 422) {
      const errJson = await res.json().catch(() => null);
      const msg = parseErrorMessage(errJson, "Validation error occurred");
      return { ok: false, kind: "validation", status: res.status, message: msg, details: errJson };
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const msg = parseErrorMessage(errJson, `Request failed with HTTP ${res.status}`);
      return { ok: false, kind: "http", status: res.status, message: msg, details: errJson };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return {
      ok: false,
      kind: aborted ? "timeout" : "unavailable",
      message: aborted
        ? "Request timed out while connecting to backend"
        : "Unable to reach the backend service (network error or Render cold start)",
    };
  } finally {
    clearTimeout(timer);
  }
}

// ==========================================
// Verified API Route Endpoints
// ==========================================

// System Diagnostics & Health (with cold start grace timeout)
export const fetchHealth = () => apiGet<HealthResponse>("/health", { timeoutMs: 25000 });
export const fetchReadiness = () => apiGet<ReadinessResponse>("/ready", { timeoutMs: 25000 });
export const fetchModelStatus = () => apiGet<ModelStatusResponse>("/api/v1/model/status", { timeoutMs: 25000 });

// Telemetry & Edge Devices
export const fetchLatestTelemetry = (deviceId = "esp32_device_01") =>
  apiGet<DeviceTelemetry>(`/api/v1/devices/${encodeURIComponent(deviceId)}/latest`);

export const fetchTelemetryHistory = (deviceId = "esp32_device_01") =>
  apiGet<TelemetryHistoryResponse>(`/api/v1/devices/${encodeURIComponent(deviceId)}/history`);

export interface DeviceCommandResponse {
  success: boolean;
  command_id?: number;
  device_id: string;
  command: string;
  status: string;
  dispatched_at?: string;
  timestamp?: string;
  message: string;
}

export const dispatchDeviceCommand = (
  deviceId = "esp32_device_01",
  command: string,
  payload?: Record<string, unknown>
) =>
  apiPost<DeviceCommandResponse>(
    `/api/v1/devices/${encodeURIComponent(deviceId)}/command`,
    { command, payload: payload ?? {} }
  );

export const sendDeviceCommand = dispatchDeviceCommand;

// Clinical Alerts & SOS (Phase 2)
export const fetchAlerts = (limit = 50) =>
  apiGet<AlertsResponse>(`/api/v1/alerts?limit=${limit}`);

export const acknowledgeAlert = (alertId: number) =>
  apiPatch<{ success: boolean; alert_id: number; status: string; acknowledged_at: string; message: string }>(
    `/api/v1/alerts/${alertId}/acknowledge`
  );

export const triggerSosAlert = (payload: {
  device_id?: string;
  patient_id?: string;
  severity?: string;
  reason?: string;
  location?: string;
}) =>
  apiPost<{ success: boolean; alert: AlertItem; message: string }>("/api/v1/alerts/sos", {
    device_id: payload.device_id || "esp32_device_01",
    patient_id: payload.patient_id || "patient_1001",
    severity: payload.severity || "critical",
    reason: payload.reason || "Emergency SOS broadcast triggered from clinical dashboard",
    location: payload.location || "Patient Room 302",
  });

// Prescriptions & Pharmacy (Phase 4)
export const fetchPrescriptions = (patientId?: string) => {
  const q = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : "";
  return apiGet<PrescriptionsResponse>(`/api/v1/prescriptions${q}`);
};

export const createPrescription = (payload: {
  patient_id?: string;
  name: string;
  dosage: string;
  frequency: string;
  doctor: string;
  remaining_days?: number;
  total_days?: number;
  refills_left?: number;
  instructions?: string;
}) => apiPost<{ success: boolean; prescription: PrescriptionItem }>("/api/v1/prescriptions", payload);

export const refillPrescription = (prescriptionId: number) =>
  apiPost<{ success: boolean; message: string; prescription: PrescriptionItem }>(
    `/api/v1/prescriptions/${prescriptionId}/refill`,
    {}
  );

// Medication Adherence (Phase 4)
export const fetchMedications = (patientId?: string) => {
  const q = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : "";
  return apiGet<MedicationsResponse>(`/api/v1/medications${q}`);
};

export const createMedication = (payload: {
  patient_id?: string;
  medication_name: string;
  time_slot: string;
  time_str: string;
  dosage: string;
  notes?: string;
  taken?: boolean;
}) => apiPost<{ success: boolean; medication: MedicationDoseItem }>("/api/v1/medications", payload);

export const toggleMedication = (medicationId: number, taken: boolean) =>
  apiPatch<{ success: boolean; medication: MedicationDoseItem; message: string }>(
    `/api/v1/medications/${medicationId}/toggle`,
    { taken }
  );

// Caregiver Network (Phase 4)
export const fetchCaregivers = (patientId?: string) => {
  const q = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : "";
  return apiGet<CaregiversResponse>(`/api/v1/caregivers${q}`);
};

export const createCaregiver = (payload: {
  patient_id?: string;
  name: string;
  role: string;
  relation: string;
  phone: string;
  email: string;
  access_level?: string;
  priority_order?: number;
}) => apiPost<{ success: boolean; caregiver: CaregiverItem }>("/api/v1/caregivers", payload);

export const notifyCaregiver = (caregiverId: number, message: string, urgency = "urgent") =>
  apiPost<{
    success: boolean;
    dispatched: boolean;
    recipient: { id: number; name: string; phone: string; email: string };
    message: string;
    urgency: string;
  }>(`/api/v1/caregivers/${caregiverId}/notify`, { message, urgency });

// Automation Rules & Workflows (Phase 4)
export const fetchAutomationRules = () =>
  apiGet<AutomationRulesResponse>("/api/v1/automation/rules");

export const createAutomationRule = (payload: {
  name: string;
  description: string;
  trigger_condition: string;
  action_payload: string;
  is_enabled?: boolean;
}) => apiPost<{ success: boolean; rule: AutomationRuleItem }>("/api/v1/automation/rules", payload);

export const toggleAutomationRule = (ruleId: number, isEnabled: boolean) =>
  apiPatch<{ success: boolean; rule: AutomationRuleItem; message: string }>(
    `/api/v1/automation/rules/${ruleId}/toggle`,
    { is_enabled: isEnabled }
  );

// Authentication Endpoints (Phase 5)
export const loginUser = async (email: string, password: string): Promise<ApiResult<AuthResponse>> => {
  const res = await apiPost<AuthResponse>("/api/v1/auth/login", { email, password });
  if (res.ok) {
    setStoredToken(res.data.access_token);
    setStoredUser(res.data.user);
  }
  return res;
};

export const signupUser = async (
  email: string,
  password: string,
  fullName?: string,
  role: "doctor" | "patient" | "nurse" | "admin" = "patient"
): Promise<ApiResult<AuthResponse>> => {
  const res = await apiPost<AuthResponse>("/api/v1/auth/signup", {
    email,
    password,
    full_name: fullName,
    role,
  });
  if (res.ok) {
    setStoredToken(res.data.access_token);
    setStoredUser(res.data.user);
  }
  return res;
};

export const fetchUserProfile = () => apiGet<UserProfile>("/api/v1/auth/me");

export const logoutUser = async (): Promise<void> => {
  try {
    await apiPost<{ success: boolean }>("/api/v1/auth/logout", {});
  } finally {
    clearStoredToken();
  }
};
