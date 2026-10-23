"use client";

import { useEffect, useState } from "react";
import {
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sliders,
  Volume2,
  Sun,
  Zap,
  Clock,
} from "lucide-react";
import {
  fetchLatestTelemetry,
  dispatchDeviceCommand,
  type DeviceTelemetry,
} from "@/lib/api";

export default function DevicesView() {
  const [telemetry, setTelemetry] = useState<DeviceTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"ok" | "err">("ok");

  const loadDevice = async () => {
    setLoading(true);
    const res = await fetchLatestTelemetry("esp32_device_01");
    if (res.ok) setTelemetry(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadDevice();
  }, []);

  const sendEdgeCommand = async (cmd: string, payload: Record<string, unknown> = {}) => {
    setSyncing(true);
    setCommandFeedback(null);
    try {
      const res = await dispatchDeviceCommand("esp32_device_01", cmd, payload);
      if (res.ok) {
        setFeedbackType("ok");
        setCommandFeedback(
          res.data.message || `Command "${cmd}" dispatched successfully (ID: #${res.data.command_id}).`
        );
      } else {
        setFeedbackType("err");
        setCommandFeedback(res.message || `Failed to dispatch command "${cmd}".`);
      }
    } catch {
      setFeedbackType("err");
      setCommandFeedback(`Network error while dispatching "${cmd}".`);
    } finally {
      setSyncing(false);
      setTimeout(() => setCommandFeedback(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="text-cyan" size={22} />
            <h2 className="text-xl font-bold">IoT Edge Devices & Hardware Fleet</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Wearable microcontroller telemetry nodes, optical sensors, and edge communication status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDevice}
            disabled={loading}
            className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Poll Device</span>
          </button>
        </div>
      </section>

      {commandFeedback && (
        <div
          className={`glass p-4 text-xs flex items-center gap-2 ${
            feedbackType === "ok"
              ? "border-ok/30 bg-ok/10 text-ok"
              : "border-crit/30 bg-crit/10 text-crit"
          }`}
        >
          {feedbackType === "ok" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{commandFeedback}</span>
        </div>
      )}

      {/* Primary Device Card */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ok flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-ok animate-ping" /> Online & Ingesting
                </span>
                <h3 className="text-base font-bold text-white mt-1">ESP32 Healthcare Wearable Node</h3>
                <p className="text-xs text-cyan font-mono">Hardware ID: esp32_device_01</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-menu text-cyan">
                <Cpu size={20} />
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-white/10 bg-base/50 p-3">
                <span className="text-muted text-[11px]">Optical Sensor</span>
                <p className="font-bold text-white mt-0.5">MAX30102 PPG</p>
                <p className="text-[10px] text-ok mt-0.5">Heart Rate + SpO₂</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-base/50 p-3">
                <span className="text-muted text-[11px]">Thermal Probe</span>
                <p className="font-bold text-white mt-0.5">DS18B20 1-Wire</p>
                <p className="text-[10px] text-ok mt-0.5">12-Bit Digital Temp</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-base/50 p-3">
                <span className="text-muted text-[11px]">Wi-Fi Connectivity</span>
                <p className="font-bold text-white mt-0.5 font-mono">RSSI -58 dBm</p>
                <p className="text-[10px] text-ok mt-0.5">Strong Signal</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-base/50 p-3">
                <span className="text-muted text-[11px]">Firmware Image</span>
                <p className="font-bold text-white mt-0.5 font-mono">v2.4.1-edge</p>
                <p className="text-[10px] text-muted mt-0.5">OTA Up-to-Date</p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-deep border border-white/5 text-xs flex justify-between items-center">
              <span className="text-muted">Last Received Telemetry:</span>
              <span className="font-mono text-cyan">
                {telemetry?.measured_at ? new Date(telemetry.measured_at).toLocaleTimeString() : "Syncing..."}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2.5">
              Edge Actuation & Diagnostics Controls
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => sendEdgeCommand("TEST_BUZZER", { frequency_hz: 2400, duration_ms: 1000 })}
                disabled={syncing}
                className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <Volume2 size={13} className="text-warn" />
                <span>Test Hardware Buzzer</span>
              </button>
              <button
                onClick={() => sendEdgeCommand("CALIBRATE_MAX30102_LED", { red_current_ma: 24, ir_current_ma: 24 })}
                disabled={syncing}
                className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <Sliders size={13} className="text-cyan" />
                <span>Calibrate MAX30102 LED</span>
              </button>
              <button
                onClick={() => sendEdgeCommand("TRIGGER_CALIBRATION_FLASH", { pulses: 3, interval_ms: 250 })}
                disabled={syncing}
                className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <Zap size={13} className="text-brand" />
                <span>Trigger Calibration Flash</span>
              </button>
              <button
                onClick={() => sendEdgeCommand("FORCE_NTP_SYNC", { server: "pool.ntp.org" })}
                disabled={syncing}
                className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5 text-muted hover:text-white"
              >
                <Clock size={13} />
                <span>Sync NTP Clock</span>
              </button>
            </div>
          </div>
        </div>

        {/* Standby Secondary Node */}
        <div className="glass p-6 flex flex-col justify-between opacity-80">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Standby Node
                </span>
                <h3 className="text-base font-bold text-white mt-1">Bedside Monitoring Terminal</h3>
                <p className="text-xs text-muted font-mono">Hardware ID: esp32_device_02</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-menu text-muted">
                <Cpu size={20} />
              </span>
            </div>

            <div className="mt-5 space-y-3 text-xs text-muted">
              <p>Secondary edge hardware configured for bedside clinical telemetry capture.</p>
              <div className="rounded-xl border border-white/5 bg-base/30 p-3">
                <span className="text-[11px] block text-muted">Status</span>
                <span className="font-mono text-white">Standby / Configured</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <button
              onClick={() => sendEdgeCommand("PAIR_SECONDARY_NODE", { node_id: "esp32_device_02" })}
              disabled={syncing}
              className="btn text-xs py-2 px-4 w-full"
            >
              Pair Device
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
