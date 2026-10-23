"use client";

import { useEffect, useState, useMemo } from "react";
import {
  History,
  Download,
  Filter,
  Search,
  RefreshCw,
  HeartPulse,
  Droplets,
  Thermometer,
  Calendar,
  Layers,
} from "lucide-react";
import { fetchTelemetryHistory, type DeviceTelemetry } from "@/lib/api";

export default function HistoryView() {
  const [history, setHistory] = useState<DeviceTelemetry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterQuality, setFilterQuality] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const loadHistory = async () => {
    setLoading(true);
    const res = await fetchTelemetryHistory("esp32_device_01");
    if (res.ok) {
      setHistory(res.data.items ?? []);
      setError(null);
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchQuality = filterQuality === "all" || (item.sensor_quality || "good") === filterQuality;
      const matchSearch =
        search === "" ||
        item.device_id.toLowerCase().includes(search.toLowerCase()) ||
        String(item.id).includes(search);
      return matchQuality && matchSearch;
    });
  }, [history, filterQuality, search]);

  const stats = useMemo(() => {
    if (history.length === 0) return { avgHr: 0, avgSpo2: 0, avgTemp: 0 };
    const validHr = history.filter((h) => h.heart_rate_bpm != null);
    const validSpo2 = history.filter((h) => h.spo2_percent != null);
    const validTemp = history.filter((h) => h.temperature_c != null);

    const avgHr = validHr.length ? validHr.reduce((acc, h) => acc + (h.heart_rate_bpm || 0), 0) / validHr.length : 0;
    const avgSpo2 = validSpo2.length ? validSpo2.reduce((acc, h) => acc + (h.spo2_percent || 0), 0) / validSpo2.length : 0;
    const avgTemp = validTemp.length ? validTemp.reduce((acc, h) => acc + (h.temperature_c || 0), 0) / validTemp.length : 0;

    return {
      avgHr: Math.round(avgHr),
      avgSpo2: avgSpo2.toFixed(1),
      avgTemp: avgTemp.toFixed(1),
    };
  }, [history]);

  const exportCSV = () => {
    if (history.length === 0) return;
    const headers = ["Packet ID", "Device ID", "Timestamp", "Heart Rate (BPM)", "SpO2 (%)", "Temperature (C)", "Quality"];
    const rows = history.map((h) => [
      h.id,
      h.device_id,
      h.measured_at,
      h.heart_rate_bpm ?? "",
      h.spo2_percent ?? "",
      h.temperature_c ?? "",
      h.sensor_quality ?? "good",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `telemetry_history_esp32_device_01_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <History className="text-cyan" size={22} />
            <h2 className="text-xl font-bold">Health History & Telemetry Log</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Aggregated vitals records for patient node: <span className="font-mono text-cyan">esp32_device_01</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            disabled={history.length === 0}
            className="btn flex items-center gap-2 text-xs py-2 px-4"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={loadHistory}
            disabled={loading}
            className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </section>

      {/* Stats Overview */}
      <section className="grid gap-4 sm:grid-cols-4">
        <div className="glass p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Total Packets</p>
          <p className="mt-2 text-2xl font-bold text-white font-mono">{history.length}</p>
          <p className="mt-1 text-xs text-muted">Persisted in datastore</p>
        </div>
        <div className="glass p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Average HR</p>
          <p className="mt-2 text-2xl font-bold text-brand font-mono">{stats.avgHr} <span className="text-sm font-normal text-muted">BPM</span></p>
          <p className="mt-1 text-xs text-muted">Normal baseline range</p>
        </div>
        <div className="glass p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Average SpO₂</p>
          <p className="mt-2 text-2xl font-bold text-cyan font-mono">{stats.avgSpo2} <span className="text-sm font-normal text-muted">%</span></p>
          <p className="mt-1 text-xs text-muted">Optimal oxygenation</p>
        </div>
        <div className="glass p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Average Temp</p>
          <p className="mt-2 text-2xl font-bold text-warn font-mono">{stats.avgTemp} <span className="text-sm font-normal text-muted">°C</span></p>
          <p className="mt-1 text-xs text-muted">Normothermic</p>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="glass p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="text-muted" />
          <input
            type="text"
            placeholder="Search packet ID or device..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-white placeholder:text-muted focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <Filter size={14} className="text-muted" />
          <select
            value={filterQuality}
            onChange={(e) => setFilterQuality(e.target.value)}
            className="bg-base border border-white/20 text-xs rounded-xl px-3 py-1.5 text-white outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="all">All Qualities</option>
            <option value="good">Good Quality</option>
            <option value="fair">Fair Quality</option>
            <option value="poor">Poor Quality</option>
          </select>
        </div>
      </section>

      {/* History Table */}
      <section className="glass p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-muted uppercase tracking-wider">
                <th className="py-3 px-3">Packet ID</th>
                <th className="py-3 px-3">Recorded At</th>
                <th className="py-3 px-3">Heart Rate</th>
                <th className="py-3 px-3">SpO₂</th>
                <th className="py-3 px-3">Body Temp</th>
                <th className="py-3 px-3">Signal Quality</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted animate-pulse">
                    Loading historical telemetry...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    No matching records found.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition">
                    <td className="py-3 px-3 font-bold text-cyan">#{item.id}</td>
                    <td className="py-3 px-3 text-muted">
                      {new Date(item.measured_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      {item.heart_rate_bpm != null ? `${item.heart_rate_bpm} BPM` : "—"}
                    </td>
                    <td className="py-3 px-3 font-bold text-cyan">
                      {item.spo2_percent != null ? `${item.spo2_percent}%` : "—"}
                    </td>
                    <td className="py-3 px-3 font-bold text-warn">
                      {item.temperature_c != null ? `${item.temperature_c}°C` : "—"}
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded-full bg-ok/20 text-ok px-2.5 py-0.5 text-[10px] uppercase font-semibold">
                        {item.sensor_quality || "good"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-muted text-[11px]">
                      {item.data_quality_status || "valid"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
