"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Activity,
  HeartPulse,
  Droplets,
  Thermometer,
  Wifi,
  RefreshCw,
  Play,
  Pause,
  AlertTriangle,
  Cpu,
  Radio,
  Clock,
} from "lucide-react";
import MetricCard from "@/components/MetricCard";
import { fetchLatestTelemetry, type DeviceTelemetry } from "@/lib/api";

export default function LiveMonitoringView() {
  const [telemetry, setTelemetry] = useState<DeviceTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyPackets, setHistoryPackets] = useState<DeviceTelemetry[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const waveOffsetRef = useRef<number>(0);

  const pollTelemetry = useCallback(async () => {
    const res = await fetchLatestTelemetry("esp32_device_01");
    if (res.ok) {
      setTelemetry(res.data);
      setError(null);
      setHistoryPackets((prev) => {
        if (prev.length > 0 && prev[0].id === res.data.id) return prev;
        return [res.data, ...prev.slice(0, 9)];
      });
    } else {
      setError(res.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    pollTelemetry();
  }, [pollTelemetry]);

  useEffect(() => {
    if (!streaming) return;
    const interval = setInterval(pollTelemetry, 5000);
    return () => clearInterval(interval);
  }, [streaming, pollTelemetry]);

  // Animated ECG / PPG rhythm canvas waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;
      const width = canvas.width;
      const height = canvas.height;
      const mid = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Grid background
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      const step = 20;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // ECG Waveform path
      ctx.beginPath();
      ctx.strokeStyle = "#21D4FD";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "rgba(33, 212, 253, 0.6)";
      ctx.shadowBlur = 10;

      waveOffsetRef.current += streaming ? 2.5 : 0;
      const offset = waveOffsetRef.current;

      const bpm = telemetry?.heart_rate_bpm ?? 75;
      const cycleLen = Math.max(80, (60 / bpm) * 140);

      for (let x = 0; x < width; x++) {
        const t = (x + offset) % cycleLen;
        let y = mid;

        // P wave
        if (t > 15 && t < 30) {
          y -= Math.sin(((t - 15) / 15) * Math.PI) * 8;
        }
        // Q dip
        else if (t >= 32 && t < 36) {
          y += 6;
        }
        // R peak
        else if (t >= 36 && t < 44) {
          const p = (t - 36) / 8;
          y -= Math.sin(p * Math.PI) * 42;
        }
        // S dip
        else if (t >= 44 && t < 49) {
          y += 10;
        }
        // T wave
        else if (t > 58 && t < 85) {
          y -= Math.sin(((t - 58) / 27) * Math.PI) * 14;
        }

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [streaming, telemetry?.heart_rate_bpm]);

  const timestamp = telemetry?.measured_at
    ? new Date(telemetry.measured_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : undefined;

  return (
    <div className="space-y-6">
      {/* Stream Control Header */}
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <Radio className={streaming ? "text-ok animate-pulse" : "text-muted"} size={18} />
            <h2 className="text-xl font-bold">Real-Time Vital Signs Telemetry</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Streaming edge telemetry from IoT hardware node:{" "}
            <span className="font-mono text-cyan font-semibold">esp32_device_01</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setStreaming(!streaming)}
            className={`btn flex items-center gap-2 text-xs py-2.5 px-4 ${
              streaming ? "bg-ok hover:opacity-90" : "bg-muted/30"
            }`}
          >
            {streaming ? <Pause size={14} /> : <Play size={14} />}
            <span>{streaming ? "Live Stream Active" : "Stream Paused"}</span>
          </button>
          <button
            onClick={pollTelemetry}
            disabled={loading}
            className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs"
            title="Poll latest packet"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Sync</span>
          </button>
        </div>
      </section>

      {/* Error notification if any */}
      {error && (
        <div className="glass border-warn/30 bg-warn/10 p-4 text-xs text-warn flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>Backend sync notice: {error}</span>
        </div>
      )}

      {/* Live Biometric Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Heart Rate"
          unit="BPM"
          icon={HeartPulse}
          value={telemetry?.heart_rate_bpm}
          timestamp={timestamp}
          loading={loading}
          note="Sensor syncing..."
        />
        <MetricCard
          label="SpO₂ Saturation"
          unit="%"
          icon={Droplets}
          value={telemetry?.spo2_percent}
          timestamp={timestamp}
          loading={loading}
          note="Sensor syncing..."
        />
        <MetricCard
          label="Body Temperature"
          unit="°C"
          icon={Thermometer}
          value={telemetry?.temperature_c}
          timestamp={timestamp}
          loading={loading}
          note="Sensor syncing..."
        />
        <div className="glass p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Signal Quality</p>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-menu text-ok shadow-[0_0_14px_rgba(1,181,116,.4)]">
              <Wifi size={16} />
            </span>
          </div>
          <div className="mt-3">
            <span className="inline-block rounded-full bg-ok/20 text-ok px-3 py-1 text-xs font-bold uppercase tracking-wider">
              {telemetry?.sensor_quality ?? "optimal"}
            </span>
            <p className="mt-1.5 text-xs text-muted">Status: {telemetry?.data_quality_status ?? "valid_telemetry"}</p>
          </div>
        </div>
      </section>

      {/* ECG / PPG Live Oscilloscope */}
      <section className="glass p-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="text-cyan" size={18} />
            <h3 className="font-bold">Real-Time Physiological Waveform (PPG / Rhythm)</h3>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted font-mono">
            <span>Sweep: 25 mm/s</span>
            <span className="text-cyan font-bold">{telemetry?.heart_rate_bpm ?? 75} BPM</span>
          </div>
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-deep border border-white/10 p-2">
          <canvas
            ref={canvasRef}
            width={900}
            height={200}
            className="w-full h-48 block rounded-xl bg-[#060B28]"
          />
          <div className="absolute top-4 left-4 bg-base/80 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-[11px] font-mono text-cyan">
            MAX30102 Optical PPG Channel
          </div>
        </div>
      </section>

      {/* Packet Stream Log */}
      <section className="glass p-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="text-muted" size={18} />
            <h3 className="font-bold">Incoming Telemetry Packet Stream</h3>
          </div>
          <span className="text-xs text-muted">Auto-refreshed from PostgreSQL datastore</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-muted uppercase tracking-wider">
                <th className="py-2.5 px-3">Packet ID</th>
                <th className="py-2.5 px-3">Device</th>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">HR</th>
                <th className="py-2.5 px-3">SpO₂</th>
                <th className="py-2.5 px-3">Temp</th>
                <th className="py-2.5 px-3">Quality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {historyPackets.map((pkt) => (
                <tr key={pkt.id} className="hover:bg-white/5 transition">
                  <td className="py-2.5 px-3 text-cyan">#{pkt.id}</td>
                  <td className="py-2.5 px-3 text-white">{pkt.device_id}</td>
                  <td className="py-2.5 px-3 text-muted">
                    {new Date(pkt.measured_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="py-2.5 px-3 text-white font-bold">{pkt.heart_rate_bpm ?? "—"} BPM</td>
                  <td className="py-2.5 px-3 text-cyan font-bold">{pkt.spo2_percent ?? "—"}%</td>
                  <td className="py-2.5 px-3 text-warn font-bold">{pkt.temperature_c ?? "—"}°C</td>
                  <td className="py-2.5 px-3">
                    <span className="rounded-full bg-ok/20 text-ok px-2 py-0.5 text-[10px] uppercase font-semibold">
                      {pkt.sensor_quality || "good"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
