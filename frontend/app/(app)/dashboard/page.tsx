"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  HeartPulse,
  Droplets,
  Thermometer,
  Gauge,
  Activity,
  BrainCircuit,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import MetricCard from "@/components/MetricCard";
import { EmptyState } from "@/components/States";
import {
  fetchLatestTelemetry,
  fetchTelemetryHistory,
  fetchModelStatus,
  fetchAlerts,
  type DeviceTelemetry,
  type ModelStatusResponse,
  type AlertItem,
} from "@/lib/api";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [latest, setLatest] = useState<DeviceTelemetry | null>(null);
  const [history, setHistory] = useState<DeviceTelemetry[]>([]);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [todayString, setTodayString] = useState<string>("");

  useEffect(() => {
    setTodayString(new Date().toLocaleDateString(undefined, { dateStyle: "full" }));
  }, []);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [latestRes, historyRes, modelRes, alertsRes] = await Promise.all([
        fetchLatestTelemetry("esp32_device_01"),
        fetchTelemetryHistory("esp32_device_01"),
        fetchModelStatus(),
        fetchAlerts(10),
      ]);

      if (latestRes.ok) {
        setLatest(latestRes.data);
      } else if (latestRes.kind === "unavailable" || latestRes.kind === "timeout") {
        setError(latestRes.message);
      }

      if (historyRes.ok) {
        setHistory(historyRes.data.items ?? []);
      }

      if (modelRes.ok) {
        setModelStatus(modelRes.data);
      }

      if (alertsRes.ok) {
        setAlerts(alertsRes.data.items ?? []);
      }
    } catch {
      setError("An unexpected error occurred while communicating with the backend.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formattedTimestamp = latest?.measured_at
    ? new Date(latest.measured_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : undefined;

  return (
    <div className="space-y-6">
      {/* Backend connection banner if error occurs */}
      {error && (
        <div role="alert" className="glass border-warn/40 bg-warn/10 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-warn shrink-0" size={20} />
            <div>
              <p className="text-sm font-bold text-white">Backend Connection Notice</p>
              <p className="text-xs text-muted">{error}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="btn py-2 px-4 text-[11px] inline-flex items-center gap-1 shrink-0"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Retry
          </button>
        </div>
      )}

      {/* Welcome & Status Bar */}
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p suppressHydrationWarning className="text-sm text-muted">
            {todayString || "Today"}
          </p>
          <h2 className="text-xl font-bold">Welcome</h2>
          <p className="text-sm text-muted">
            {latest
              ? `Monitoring active for device ${latest.device_id} (Patient: ${latest.patient_id || "Unassigned"})`
              : loading
              ? "Connecting to deployed IoT backend..."
              : "No active device telemetry received yet."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="btn-ghost flex items-center gap-2 px-4 py-2 text-xs"
            title="Refresh latest telemetry"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <Link href="/reports" className="btn">
            View Health Report
          </Link>
        </div>
      </section>

      {/* Latest Readings Section */}
      <section aria-label="Latest readings" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Heart rate"
          unit="BPM"
          icon={HeartPulse}
          value={latest?.heart_rate_bpm}
          timestamp={formattedTimestamp}
          loading={loading}
          note="Waiting for sensor reading"
        />
        <MetricCard
          label="SpO₂"
          unit="%"
          icon={Droplets}
          value={latest?.spo2_percent}
          timestamp={formattedTimestamp}
          loading={loading}
          note="Waiting for sensor reading"
        />
        <MetricCard
          label="Temperature"
          unit="°C"
          icon={Thermometer}
          value={latest?.temperature_c}
          timestamp={formattedTimestamp}
          loading={loading}
          note="Waiting for sensor reading"
        />
        <MetricCard
          label="Systolic BP"
          unit="mmHg"
          icon={Gauge}
          loading={loading}
          note="No blood pressure sensor connected"
        />
        <MetricCard
          label="Diastolic BP"
          unit="mmHg"
          icon={Gauge}
          loading={loading}
          note="No blood pressure sensor connected"
        />
      </section>

      {/* Health Trends & AI Analysis */}
      <section className="grid gap-6 xl:grid-cols-3">
        {/* Health Trends Stream */}
        <div className="glass p-6 xl:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <Activity size={18} className="text-cyan" />
              <span>Health trends (Telemetry Stream)</span>
            </h3>
            {history.length > 0 && (
              <span className="text-xs text-muted">
                {history.length} record{history.length > 1 ? "s" : ""} from esp32_device_01
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3 p-4 animate-pulse">
              <div className="h-8 rounded bg-white/10" />
              <div className="h-8 rounded bg-white/10" />
              <div className="h-8 rounded bg-white/10" />
            </div>
          ) : history.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No measurements yet"
              body="Connect a MAX30102 / DS18B20 device to stream real-time heart rate, SpO₂ and temperature readings to the backend."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-muted uppercase tracking-wider">
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Heart Rate</th>
                    <th className="py-2.5 px-3">SpO₂</th>
                    <th className="py-2.5 px-3">Temperature</th>
                    <th className="py-2.5 px-3">Quality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {history.slice(0, 5).map((row) => (
                    <tr key={row.id} className="hover:bg-white/5 transition">
                      <td className="py-2.5 px-3 font-mono text-muted">
                        {new Date(row.measured_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        {row.heart_rate_bpm != null ? `${row.heart_rate_bpm} BPM` : "—"}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-cyan">
                        {row.spo2_percent != null ? `${row.spo2_percent}%` : "—"}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-warn">
                        {row.temperature_c != null ? `${row.temperature_c}°C` : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="rounded-full bg-ok/20 text-ok px-2 py-0.5 text-[10px] uppercase font-semibold">
                          {row.sensor_quality || "good"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* AI Analysis Summary */}
        <div className="glass p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <BrainCircuit size={18} className="text-violet" />
                <span>AI Models Status</span>
              </h3>
              {modelStatus?.all_loaded && (
                <span className="flex items-center gap-1 text-[11px] text-ok font-semibold">
                  <CheckCircle2 size={13} /> Loaded
                </span>
              )}
            </div>

            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-6 rounded bg-white/10" />
                <div className="h-6 rounded bg-white/10" />
                <div className="h-6 rounded bg-white/10" />
              </div>
            ) : modelStatus ? (
              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-white/10 bg-base/50 p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white">Isolation Forest</span>
                    <span className="text-[10px] text-ok bg-ok/20 px-1.5 py-0.5 rounded font-mono">
                      {modelStatus.models.isolation_forest?.loaded ? "ACTIVE" : "OFFLINE"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">Statistical outlier & boundary detection</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-base/50 p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white">One-Class SVM</span>
                    <span className="text-[10px] text-ok bg-ok/20 px-1.5 py-0.5 rounded font-mono">
                      {modelStatus.models.one_class_svm?.loaded ? "ACTIVE" : "OFFLINE"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">Non-linear kernel boundary separation</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-base/50 p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white">PyTorch Autoencoder</span>
                    <span className="text-[10px] text-ok bg-ok/20 px-1.5 py-0.5 rounded font-mono">
                      {modelStatus.models.autoencoder?.loaded ? "ACTIVE" : "OFFLINE"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">
                    MSE Reconstruction Scoring (Threshold:{" "}
                    {modelStatus.models.autoencoder?.threshold
                      ? modelStatus.models.autoencoder.threshold.toFixed(4)
                      : "N/A"}
                    )
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted">AI Model status is not currently available.</p>
            )}
          </div>

          <p className="mt-4 text-[11px] text-muted border-t border-white/10 pt-3">
            AI-generated analysis is informational and is not a medical diagnosis. Seek qualified medical care for health concerns or urgent symptoms.
          </p>
        </div>
      </section>

      {/* Recent Activity / Alerts Feed */}
      <section className="glass p-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <ShieldAlert size={18} className="text-brand" />
            <span>Clinical Alerts & Activity Feed</span>
          </h3>
          {alerts.length > 0 && (
            <span className="text-xs text-muted">
              {alerts.length} event{alerts.length > 1 ? "s" : ""} recorded
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-10 rounded bg-white/10" />
            <div className="h-10 rounded bg-white/10" />
          </div>
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All clear"
            body="No clinical alerts or physiological threshold breaches currently open."
          />
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const isCrit = alert.severity === "critical";
              return (
                <div
                  key={alert.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-field border transition ${
                    isCrit ? "bg-crit/10 border-crit/30" : "bg-warn/10 border-warn/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white ${
                        isCrit ? "bg-crit shadow-[0_0_12px_rgba(227,26,26,.5)]" : "bg-warn"
                      }`}
                    >
                      <AlertTriangle size={16} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isCrit ? "bg-crit/20 text-crit" : "bg-warn/20 text-warn"
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-xs font-mono text-muted">Device: {alert.device_id}</span>
                        <span className="text-xs text-muted">• Status: {alert.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-white/90 font-medium leading-relaxed">{alert.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted shrink-0 self-end sm:self-center font-mono">
                    <Clock size={12} />
                    <span>
                      {new Date(alert.triggered_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
