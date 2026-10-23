"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Lock,
  Key,
  CheckCircle2,
  Database,
  Save,
} from "lucide-react";

export default function PrivacyView() {
  const [researchConsent, setResearchConsent] = useState(true);
  const [modelTrainingConsent, setModelTrainingConsent] = useState(false);
  const [emergencySharingConsent, setEmergencySharingConsent] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedResearch = localStorage.getItem("uyir_pref_research_consent");
      if (savedResearch !== null) setResearchConsent(savedResearch === "true");

      const savedEmergency = localStorage.getItem("uyir_pref_emergency_consent");
      if (savedEmergency !== null) setEmergencySharingConsent(savedEmergency === "true");

      const savedModel = localStorage.getItem("uyir_pref_model_training_consent");
      if (savedModel !== null) setModelTrainingConsent(savedModel === "true");
    }
  }, []);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("uyir_pref_research_consent", String(researchConsent));
      localStorage.setItem("uyir_pref_emergency_consent", String(emergencySharingConsent));
      localStorage.setItem("uyir_pref_model_training_consent", String(modelTrainingConsent));

      window.dispatchEvent(
        new CustomEvent("uyir-privacy-consent-updated", {
          detail: {
            researchConsent,
            emergencySharingConsent,
            modelTrainingConsent,
          },
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
            <ShieldCheck className="text-ok" size={24} />
            <h2 className="text-xl font-bold">Privacy, Security & Data Governance</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            End-to-end cryptographic protection, regulatory compliance, and granular consent management. Choices persist locally and govern telemetry sharing.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-ok/20 border border-ok/30 px-3 py-1.5 rounded-xl text-ok text-xs font-bold">
          <CheckCircle2 size={15} />
          <span>HIPAA & GDPR Enforced</span>
        </div>
      </section>

      {saved && (
        <div className="glass border-ok/30 bg-ok/10 p-4 text-xs text-ok flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Privacy preferences updated and persisted across platform sessions.</span>
        </div>
      )}

      {/* Security Architecture Cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="glass p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white text-xs uppercase tracking-wider">In-Flight Encryption</span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-menu text-cyan">
                <Lock size={14} />
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              All telemetry payloads transmitted via TLS 1.3 with AES-GCM 256 cipher suite protection.
            </p>
          </div>
          <p className="mt-4 pt-2 border-t border-white/10 text-[11px] font-mono text-cyan">Status: ACTIVE</p>
        </div>

        <div className="glass p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white text-xs uppercase tracking-wider">Row-Level Security</span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-menu text-brand">
                <Database size={14} />
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Supabase PostgreSQL enforces strict multi-tenant RLS isolation across patient records.
            </p>
          </div>
          <p className="mt-4 pt-2 border-t border-white/10 text-[11px] font-mono text-brand">Status: ENFORCED</p>
        </div>

        <div className="glass p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white text-xs uppercase tracking-wider">Device Auth</span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-menu text-ok">
                <Key size={14} />
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              IoT edge microcontrollers authenticate via cryptographically random X-API-Key headers.
            </p>
          </div>
          <p className="mt-4 pt-2 border-t border-white/10 text-[11px] font-mono text-ok">Status: VERIFIED</p>
        </div>
      </section>

      {/* Consent Controls */}
      <section className="glass p-6">
        <h3 className="font-bold text-xs uppercase tracking-wider text-muted mb-4">Patient Consent Controls</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-field border border-white/10 bg-base/50">
            <div>
              <h4 className="text-sm font-bold text-white">Emergency Services Telemetry Sharing</h4>
              <p className="text-xs text-muted mt-0.5">
                Automatically transmits real-time vitals and GPS coordinates to EMS when SOS is triggered.
              </p>
            </div>
            <input
              type="checkbox"
              checked={emergencySharingConsent}
              onChange={(e) => setEmergencySharingConsent(e.target.checked)}
              className="h-5 w-5 accent-brand cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-field border border-white/10 bg-base/50">
            <div>
              <h4 className="text-sm font-bold text-white">De-Identified Clinical Research Participation</h4>
              <p className="text-xs text-muted mt-0.5">
                Allows anonymized cardiovascular and pulse oximetry metrics to aid clinical research.
              </p>
            </div>
            <input
              type="checkbox"
              checked={researchConsent}
              onChange={(e) => setResearchConsent(e.target.checked)}
              className="h-5 w-5 accent-brand cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-field border border-white/10 bg-base/50">
            <div>
              <h4 className="text-sm font-bold text-white">AI Model Continuous Improvement</h4>
              <p className="text-xs text-muted mt-0.5">
                Permits isolated anomaly samples to be utilized for model weights fine-tuning.
              </p>
            </div>
            <input
              type="checkbox"
              checked={modelTrainingConsent}
              onChange={(e) => setModelTrainingConsent(e.target.checked)}
              className="h-5 w-5 accent-brand cursor-pointer"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={handleSave} className="btn py-2 px-6 text-xs flex items-center gap-2">
            <Save size={14} />
            <span>Save Preferences</span>
          </button>
        </div>
      </section>
    </div>
  );
}
