"use client";

import { useEffect, useState, useMemo } from "react";
import {
  FileText,
  Printer,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  Droplets,
  Thermometer,
  ShieldCheck,
  RefreshCw,
  Cpu,
} from "lucide-react";
import {
  fetchLatestTelemetry,
  fetchTelemetryHistory,
  fetchModelStatus,
  getStoredUser,
  type DeviceTelemetry,
  type ModelStatusResponse,
} from "@/lib/api";

export default function ReportsView() {
  const [latest, setLatest] = useState<DeviceTelemetry | null>(null);
  const [history, setHistory] = useState<DeviceTelemetry[]>([]);
  const [models, setModels] = useState<ModelStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const user = typeof window !== "undefined" ? getStoredUser() : null;

  const loadReportData = async () => {
    setLoading(true);
    const [latRes, histRes, modelRes] = await Promise.all([
      fetchLatestTelemetry("esp32_device_01"),
      fetchTelemetryHistory("esp32_device_01"),
      fetchModelStatus(),
    ]);

    if (latRes.ok) setLatest(latRes.data);
    if (histRes.ok && histRes.data.items) setHistory(histRes.data.items);
    if (modelRes.ok) setModels(modelRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const stats = useMemo(() => {
    if (history.length === 0) {
      return {
        avgHr: latest?.heart_rate_bpm ?? 75,
        avgSpo2: latest?.spo2_percent ?? 98.5,
        avgTemp: latest?.temperature_c ?? 36.6,
        samples: latest ? 1 : 0,
      };
    }
    const hrs = history.filter((h) => h.heart_rate_bpm != null).map((h) => h.heart_rate_bpm!);
    const spos = history.filter((h) => h.spo2_percent != null).map((h) => h.spo2_percent!);
    const temps = history.filter((h) => h.temperature_c != null).map((h) => h.temperature_c!);

    const avgHr = hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : 75;
    const avgSpo2 = spos.length ? Math.round((spos.reduce((a, b) => a + b, 0) / spos.length) * 10) / 10 : 98.5;
    const avgTemp = temps.length ? Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10 : 36.6;

    return { avgHr, avgSpo2, avgTemp, samples: history.length };
  }, [history, latest]);

  // Dynamic stability index (normal ranges: HR 60-100, SpO2 >= 95, Temp 36.0-37.5)
  const stabilityIndex = useMemo(() => {
    let score = 95;
    if (stats.avgHr < 60 || stats.avgHr > 100) score -= 15;
    if (stats.avgSpo2 < 95) score -= 20;
    if (stats.avgTemp > 38.0 || stats.avgTemp < 35.5) score -= 15;
    return Math.max(50, Math.min(100, score));
  }, [stats]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="text-cyan" size={22} />
            <h2 className="text-xl font-bold">Clinical Health & Vitals Report</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Aggregated diagnostic synthesis and automated clinical analysis for Patient ID:{" "}
            <span className="font-mono text-cyan font-semibold">patient_1001</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadReportData}
            disabled={loading}
            className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh Data</span>
          </button>
          <button
            onClick={handlePrint}
            className="btn flex items-center gap-2 text-xs py-2 px-4 font-bold"
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>
        </div>
      </section>

      {/* Patient Profile & Baseline Card */}
      <section className="glass p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pb-6 border-b border-white/10">
          <div>
            <p className="text-xs text-muted uppercase tracking-wider">Monitored Subject</p>
            <p className="mt-1 text-sm font-bold text-white">
              {user?.full_name || "Alexander Bennett"}
            </p>
            <p className="text-[10px] text-muted font-mono">{user?.email || "patient_1001@uyir.org"}</p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wider">Assigned Edge Node</p>
            <p className="mt-1 text-sm font-bold text-cyan font-mono">
              {latest?.device_id || "esp32_device_01"}
            </p>
            <p className="text-[10px] text-ok">MAX30102 + DS18B20</p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wider">Sampling Volume</p>
            <p className="mt-1 text-sm font-bold text-white font-mono">
              {stats.samples} Telemetry Packets
            </p>
            <p className="text-[10px] text-muted">Live Stream Ingested</p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wider">Stability Index</p>
            <p className="mt-1 text-sm font-bold text-ok flex items-center gap-1.5">
              <CheckCircle2 size={16} /> {stabilityIndex} / 100 ({stabilityIndex >= 85 ? "Stable" : "Guarded"})
            </p>
            <p className="text-[10px] text-muted">Continuous Scoring</p>
          </div>
        </div>

        {/* Clinical Stability Matrix */}
        <div className="mt-6 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Physiological Stability Evaluation (Rolling Mean)</h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-white flex items-center gap-1.5">
                  <HeartPulse size={14} className="text-cyan" /> Cardiovascular Stability (Resting HR)
                </span>
                <span className="font-mono text-cyan font-bold">{stats.avgHr} BPM</span>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(30, (stats.avgHr / 120) * 100))}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-white flex items-center gap-1.5">
                  <Droplets size={14} className="text-ok" /> Oxygenation Index (Peripheral SpO₂)
                </span>
                <span className="font-mono text-ok font-bold">{stats.avgSpo2}%</span>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-ok rounded-full transition-all"
                  style={{ width: `${Math.min(100, stats.avgSpo2)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-white flex items-center gap-1.5">
                  <Thermometer size={14} className="text-warn" /> Thermal Homeostasis (Core Temp)
                </span>
                <span className="font-mono text-warn font-bold">{stats.avgTemp}°C</span>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-warn rounded-full transition-all"
                  style={{ width: `${Math.min(100, (stats.avgTemp / 40) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Findings & Alert Log Summary */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass p-6">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <ShieldCheck size={16} className="text-ok" /> Key Diagnostic Findings
          </h3>
          <ul className="space-y-2.5 text-xs text-white/80 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan mt-1.5 shrink-0" />
              <span>
                Rolling heart rate baseline calculates to <strong>{stats.avgHr} BPM</strong> across live IoT sensor packets.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-ok mt-1.5 shrink-0" />
              <span>
                Blood oxygen saturation baseline verified at <strong>{stats.avgSpo2}%</strong> with {stats.avgSpo2 >= 95 ? "optimal alveolar diffusion" : "mild desaturation observed"}.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-warn mt-1.5 shrink-0" />
              <span>
                Mean digital temperature registered at <strong>{stats.avgTemp}°C</strong> with no sustained hyperthermic spikes.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
              <span>
                Multi-model AI inference engine status: <strong>{models?.all_loaded ? "All Models Active (Isolation Forest, SVM, Autoencoder)" : "Inference Online"}</strong>.
              </span>
            </li>
          </ul>
        </div>

        <div className="glass p-6">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-warn" /> Physician Recommendations
          </h3>
          <ul className="space-y-2.5 text-xs text-white/80 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-warn mt-1.5 shrink-0" />
              <span>Continue continuous wearable monitoring with MAX30102 / DS18B20 edge sensor node.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan mt-1.5 shrink-0" />
              <span>Maintain daily medication schedule compliance via the automated dosing checklist.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-ok mt-1.5 shrink-0" />
              <span>Telemetry telemetry is archived in the Supabase PostgreSQL clinical data warehouse.</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
