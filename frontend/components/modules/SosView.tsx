"use client";

import { useState } from "react";
import {
  Siren,
  AlertTriangle,
  PhoneCall,
  ShieldAlert,
  Radio,
  CheckCircle2,
  MapPin,
  Clock,
  HeartPulse,
} from "lucide-react";

import { triggerSosAlert, acknowledgeAlert } from "@/lib/api";

export default function SosView() {
  const [sosActive, setSosActive] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosAlertId, setSosAlertId] = useState<number | null>(null);
  const [sosResponseMsg, setSosResponseMsg] = useState<string | null>(null);

  const triggerSOS = async () => {
    setSosLoading(true);
    const res = await triggerSosAlert({
      device_id: "esp32_device_01",
      patient_id: "patient_1001",
      severity: "critical",
      reason: "Clinical emergency SOS manually broadcast from dashboard",
      location: "Patient Room 302 / Cardiac Telemetry Ward",
    });
    if (res.ok) {
      setSosActive(true);
      setSosAlertId(res.data.alert?.id ?? null);
      setSosResponseMsg(res.data.message);
    } else {
      alert(`Emergency Broadcast Notice: ${res.message}`);
    }
    setSosLoading(false);
  };

  const cancelSOS = async () => {
    if (sosAlertId) {
      await acknowledgeAlert(sosAlertId);
    }
    setSosActive(false);
    setSosAlertId(null);
    setSosResponseMsg(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <Siren className="text-crit animate-pulse" size={24} />
            <h2 className="text-xl font-bold">Emergency SOS & Critical Escalation</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Direct clinical dispatch and automated caregiver emergency broadcast center.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-ok animate-ping" />
          <span className="text-xs text-ok font-bold uppercase tracking-wider">SOS Dispatch Standby</span>
        </div>
      </section>

      {/* Emergency Action Hero */}
      <section className={`glass p-8 text-center transition-all duration-300 ${
        sosActive ? "border-crit bg-crit/15" : "border-white/10"
      }`}>
        <div className="max-w-md mx-auto space-y-4">
          <div className={`mx-auto grid h-24 w-24 place-items-center rounded-3xl ${
            sosActive ? "bg-crit shadow-[0_0_30px_rgba(227,26,26,.8)] animate-bounce" : "bg-crit/20 text-crit border border-crit/40"
          }`}>
            <Siren size={44} className={sosActive ? "text-white" : "text-crit"} />
          </div>

          <h3 className="text-xl font-bold text-white">
            {sosActive ? "EMERGENCY BROADCAST TRIGGERED" : "One-Touch Emergency SOS"}
          </h3>
          <p className="text-xs text-muted leading-relaxed">
            {sosActive
              ? "Emergency alerts, edge hardware alarms, and live GPS vitals are broadcasting to primary caregivers and EMS."
              : "Pressing this button activates edge buzzer on esp32_device_01, alerts your physician, and contacts emergency medical services."}
          </p>

          <div className="pt-2 flex justify-center gap-4">
            {!sosActive ? (
              <button
                onClick={triggerSOS}
                disabled={sosLoading}
                className="btn bg-crit hover:opacity-90 px-8 py-4 text-sm font-bold shadow-[0_0_20px_rgba(227,26,26,.4)] disabled:opacity-50"
              >
                {sosLoading ? "BROADCASTING TO EMS & CLOUD..." : "BROADCAST EMERGENCY SOS"}
              </button>
            ) : (
              <button
                onClick={cancelSOS}
                className="btn bg-white/20 hover:bg-white/30 text-white px-6 py-3 text-xs"
              >
                Cancel Emergency Alert (Acknowledge)
              </button>
            )}
          </div>

          {sosResponseMsg && (
            <p className="text-[11px] font-mono text-ok mt-2 bg-ok/10 border border-ok/30 py-1.5 px-3 rounded-lg">
              ✓ {sosResponseMsg} (Alert #{sosAlertId})
            </p>
          )}
        </div>
      </section>

      {/* Escalation Tiers */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-2 text-cyan">
            <Radio size={18} />
            <h4 className="font-bold text-xs uppercase tracking-wider">Tier 1: Edge Node</h4>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Triggers high-decibel piezo buzzer on <span className="font-mono text-white">esp32_device_01</span> and flashes visual indicator LEDs.
          </p>
        </div>

        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-2 text-warn">
            <PhoneCall size={18} />
            <h4 className="font-bold text-xs uppercase tracking-wider">Tier 2: Caregiver SMS</h4>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Sends high-priority SMS & automated voice call to primary contact: <span className="text-white">Sarah Jenkins</span>.
          </p>
        </div>

        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-2 text-crit">
            <ShieldAlert size={18} />
            <h4 className="font-bold text-xs uppercase tracking-wider">Tier 3: EMS Dispatch</h4>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Transmits real-time physiological telemetry, patient allergy notes, and geo-location to emergency dispatch.
          </p>
        </div>
      </section>

      {/* Direct Emergency Dials */}
      <section className="glass p-6">
        <h4 className="font-bold text-xs uppercase tracking-wider text-muted mb-4">Direct Emergency Numbers</h4>
        <div className="grid gap-3 sm:grid-cols-3 text-xs">
          <a
            href="tel:911"
            className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-base/50 hover:bg-white/5 transition"
          >
            <span className="font-bold text-white">Emergency Services (EMS)</span>
            <span className="font-mono text-crit font-bold">911 / 108</span>
          </a>
          <a
            href="tel:5557204491"
            className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-base/50 hover:bg-white/5 transition"
          >
            <span className="font-bold text-white">Cardiology On-Call</span>
            <span className="font-mono text-cyan font-bold">+1 (555) 720-4491</span>
          </a>
          <a
            href="tel:5553829014"
            className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-base/50 hover:bg-white/5 transition"
          >
            <span className="font-bold text-white">Primary Caregiver</span>
            <span className="font-mono text-ok font-bold">+1 (555) 382-9014</span>
          </a>
        </div>
      </section>
    </div>
  );
}
