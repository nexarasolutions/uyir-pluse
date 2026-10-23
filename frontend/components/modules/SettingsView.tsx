"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Sliders,
  CheckCircle2,
  Globe,
  BellRing,
  Cpu,
  Save,
  Volume2,
  RotateCw,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export default function SettingsView() {
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [samplingRate, setSamplingRate] = useState<string>("5");
  const [soundAlerts, setSoundAlerts] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUnit = localStorage.getItem("uyir_pref_unit");
      if (savedUnit === "C" || savedUnit === "F") setUnit(savedUnit);

      const savedRate = localStorage.getItem("uyir_pref_sampling_rate");
      if (savedRate) setSamplingRate(savedRate);

      const savedSound = localStorage.getItem("uyir_pref_sound_alerts");
      if (savedSound !== null) setSoundAlerts(savedSound === "true");

      const savedAuto = localStorage.getItem("uyir_pref_auto_refresh");
      if (savedAuto !== null) setAutoRefresh(savedAuto === "true");
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("uyir_pref_unit", unit);
      localStorage.setItem("uyir_pref_sampling_rate", samplingRate);
      localStorage.setItem("uyir_pref_sound_alerts", String(soundAlerts));
      localStorage.setItem("uyir_pref_auto_refresh", String(autoRefresh));

      window.dispatchEvent(
        new CustomEvent("uyir-preferences-updated", {
          detail: { unit, samplingRate, soundAlerts, autoRefresh },
        })
      );
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="text-cyan" size={22} />
            <h2 className="text-xl font-bold">Platform Settings & Preferences</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Configure biometric unit standards, edge polling frequencies, and platform options. Choices persist locally and sync across dashboards.
          </p>
        </div>
      </section>

      {saved && (
        <div className="glass border-ok/30 bg-ok/10 p-4 text-xs text-ok flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Platform preferences saved to local storage and active across dashboards.</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="glass p-6 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Temperature Standard */}
          <div>
            <label className="text-xs font-bold text-white block mb-1">
              Temperature Unit Standard
            </label>
            <p className="text-[11px] text-muted mb-2">
              Display temperature in Celsius or Fahrenheit across all dashboards and vital charts.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUnit("C")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                  unit === "C"
                    ? "bg-white/15 border-cyan text-cyan"
                    : "border-white/10 text-muted hover:text-white"
                }`}
              >
                Celsius (°C)
              </button>
              <button
                type="button"
                onClick={() => setUnit("F")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                  unit === "F"
                    ? "bg-white/15 border-cyan text-cyan"
                    : "border-white/10 text-muted hover:text-white"
                }`}
              >
                Fahrenheit (°F)
              </button>
            </div>
          </div>

          {/* Sampling Rate */}
          <div>
            <label className="text-xs font-bold text-white block mb-1">
              Telemetry Polling Rate
            </label>
            <p className="text-[11px] text-muted mb-2">
              Frequency for background refresh of live patient vitals and edge streams.
            </p>
            <select
              value={samplingRate}
              onChange={(e) => setSamplingRate(e.target.value)}
              className="field font-mono"
            >
              <option value="5">Every 5 Seconds (High Fidelity)</option>
              <option value="10">Every 10 Seconds (Standard)</option>
              <option value="30">Every 30 Seconds (Power Saver)</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 grid gap-6 md:grid-cols-2">
          {/* Sound Alerts */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-base/50">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Volume2 size={14} className="text-brand" /> Audible Anomaly Alerts
              </h4>
              <p className="text-[11px] text-muted mt-0.5">
                Play chime sound when tachycardia or hypoxemia critical alerts trigger.
              </p>
            </div>
            <input
              type="checkbox"
              checked={soundAlerts}
              onChange={(e) => setSoundAlerts(e.target.checked)}
              className="h-5 w-5 accent-brand cursor-pointer"
            />
          </div>

          {/* Auto Refresh */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-base/50">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <RotateCw size={14} className="text-cyan" /> Continuous Ingestion Streaming
              </h4>
              <p className="text-[11px] text-muted mt-0.5">
                Automatically stream telemetry from esp32_device_01 without manual reload.
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-5 w-5 accent-brand cursor-pointer"
            />
          </div>
        </div>

        {/* Backend Endpoint Display */}
        <div className="pt-4 border-t border-white/10">
          <label className="text-xs font-bold text-white block mb-1">
            Active Backend Base URL
          </label>
          <div className="flex items-center gap-2 font-mono text-xs text-cyan bg-base/70 p-3 rounded-xl border border-white/10">
            <Globe size={14} className="text-muted shrink-0" />
            <span>{API_BASE_URL}</span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="btn py-2.5 px-6 text-xs flex items-center gap-2">
            <Save size={14} />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}
