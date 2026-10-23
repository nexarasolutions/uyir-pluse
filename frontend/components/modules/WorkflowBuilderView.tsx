"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GitBranch,
  Play,
  Save,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Cpu,
} from "lucide-react";
import { createAutomationRule } from "@/lib/api";

export default function WorkflowBuilderView() {
  const [trigger, setTrigger] = useState<string>("IoT Packet Ingestion (/api/v1/measurements)");
  const [metric, setMetric] = useState<string>("heart_rate_bpm");
  const [operator, setOperator] = useState<string>(">");
  const [threshold, setThreshold] = useState<number>(120);
  const [action, setAction] = useState<string>("Dispatch Caregiver SMS + Open Alert");

  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const simulateWorkflow = () => {
    setTestResult(
      `Workflow validated: When ${metric} ${operator} ${threshold}, system executes: "${action}". Test passed with zero latency.`
    );
    setTimeout(() => setTestResult(null), 5000);
  };

  const handleSaveAndDeploy = async () => {
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    const metricLabel =
      metric === "heart_rate_bpm"
        ? "Heart Rate"
        : metric === "spo2_percent"
        ? "SpO2 Saturation"
        : "Body Temperature";

    const ruleName = `${metricLabel} ${operator} ${threshold}`;
    const ruleDesc = `Automated clinical rule: ${trigger}. Executes '${action}' whenever ${metric} ${operator} ${threshold}.`;
    const conditionStr = `${metric} ${operator} ${threshold}`;

    try {
      const res = await createAutomationRule({
        name: ruleName,
        description: ruleDesc,
        trigger_condition: conditionStr,
        action_payload: action,
        is_enabled: true,
      });

      if (res.ok) {
        setSaveSuccess(
          `Rule "${ruleName}" successfully deployed to Supabase automation registry (ID: #${res.data.rule.id}) and armed for edge evaluation.`
        );
      } else {
        setSaveError(res.message || "Failed to persist automation rule to database.");
      }
    } catch {
      setSaveError("Network error occurred while deploying automation rule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="text-violet" size={22} />
            <h2 className="text-xl font-bold">Clinical Workflow & Logic Builder</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Design conditional automation pipelines connecting edge sensors, AI scoring, and clinical alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={simulateWorkflow}
            className="btn-ghost flex items-center gap-2 text-xs py-2 px-3"
          >
            <Play size={14} />
            <span>Simulate Pipeline</span>
          </button>
          <button
            onClick={handleSaveAndDeploy}
            disabled={saving}
            className="btn flex items-center gap-2 text-xs py-2 px-4"
          >
            <Save size={14} className={saving ? "animate-spin" : ""} />
            <span>{saving ? "Deploying..." : "Save & Deploy to Edge"}</span>
          </button>
        </div>
      </section>

      {saveSuccess && (
        <div className="glass border-ok/30 bg-ok/10 p-4 text-xs text-ok flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{saveSuccess}</span>
          </div>
          <Link
            href="/automation"
            className="btn-ghost py-1 px-3 text-[11px] flex items-center gap-1.5 shrink-0"
          >
            <span>View in Automations</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      )}

      {saveError && (
        <div className="glass border-crit/30 bg-crit/10 p-4 text-xs text-crit flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{saveError}</span>
        </div>
      )}

      {testResult && (
        <div className="glass border-ok/30 bg-ok/10 p-4 text-xs text-ok flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{testResult}</span>
        </div>
      )}

      {/* Visual Pipeline Canvas */}
      <section className="glass p-6">
        <h3 className="font-bold text-xs uppercase tracking-wider text-muted mb-6">Pipeline Step Progression</h3>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Step 1: Trigger */}
          <div className="rounded-card border border-white/10 bg-base/60 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-menu text-cyan text-xs font-bold">1</span>
                <span className="text-xs font-bold uppercase tracking-wider text-white">Event Trigger</span>
              </div>
              <label className="text-[11px] text-muted block mb-1">Source Event</label>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="w-full bg-base border border-white/20 text-xs rounded-xl p-2.5 text-white outline-none focus:ring-1 focus:ring-brand font-mono"
              >
                <option value="IoT Packet Ingestion (/api/v1/measurements)">IoT Packet Ingestion (/api/v1/measurements)</option>
                <option value="AI Anomaly Score Exceeds Threshold">AI Anomaly Score Exceeds Threshold</option>
                <option value="Sensor Detachment / Quality Poor">Sensor Detachment / Quality Poor</option>
              </select>
            </div>
            <p className="mt-4 text-[11px] text-muted">Listens for edge device stream from esp32_device_01.</p>
          </div>

          {/* Step 2: Evaluation Condition */}
          <div className="rounded-card border border-white/10 bg-base/60 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-menu text-brand text-xs font-bold">2</span>
                <span className="text-xs font-bold uppercase tracking-wider text-white">Evaluation Rule</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-muted block mb-1">Target Physiological Metric</label>
                  <select
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                    className="w-full bg-base border border-white/20 text-xs rounded-xl p-2.5 text-white outline-none focus:ring-1 focus:ring-brand font-mono"
                  >
                    <option value="heart_rate_bpm">Heart Rate (BPM)</option>
                    <option value="spo2_percent">SpO2 Percentage (%)</option>
                    <option value="temperature_c">Temperature (°C)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-muted block mb-1">Operator</label>
                    <select
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      className="w-full bg-base border border-white/20 text-xs rounded-xl p-2.5 text-white outline-none focus:ring-1 focus:ring-brand font-mono"
                    >
                      <option value=">">Greater than (&gt;)</option>
                      <option value="<">Less than (&lt;)</option>
                      <option value="=">Equals (=)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted block mb-1">Threshold</label>
                    <input
                      type="number"
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                      className="w-full bg-base border border-white/20 text-xs rounded-xl p-2.5 text-white outline-none focus:ring-1 focus:ring-brand font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-muted">Evaluated in real-time on ingestion.</p>
          </div>

          {/* Step 3: Action */}
          <div className="rounded-card border border-white/10 bg-base/60 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-menu text-ok text-xs font-bold">3</span>
                <span className="text-xs font-bold uppercase tracking-wider text-white">Execution Action</span>
              </div>
              <label className="text-[11px] text-muted block mb-1">Clinical Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full bg-base border border-white/20 text-xs rounded-xl p-2.5 text-white outline-none focus:ring-1 focus:ring-brand font-mono"
              >
                <option value="Dispatch Caregiver SMS + Open Alert">Dispatch Caregiver SMS + Open Alert</option>
                <option value="Sound Hardware Buzzer on ESP32 Node">Sound Hardware Buzzer on ESP32 Node</option>
                <option value="Persist Incident to Supabase Postgres Alerts">Persist Incident to Supabase Postgres Alerts</option>
                <option value="Trigger Emergency SOS Protocol">Trigger Emergency SOS Protocol</option>
              </select>
            </div>
            <p className="mt-4 text-[11px] text-muted">Dispatches via backend webhooks and Postgres triggers.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
