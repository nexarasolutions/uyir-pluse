"use client";

import { useEffect, useState } from "react";
import {
  Workflow,
  Zap,
  Power,
  RefreshCw,
} from "lucide-react";
import {
  fetchAutomationRules,
  toggleAutomationRule,
  type AutomationRuleItem,
} from "@/lib/api";

const INITIAL_FALLBACK: AutomationRuleItem[] = [
  {
    id: 1,
    name: "Critical Bradycardia Dispatch",
    description: "Monitors resting heart rate drops below safe threshold.",
    trigger_condition: "Heart Rate < 45 BPM for > 2 min",
    action_payload: "Send Immediate Caregiver SMS + High Priority Alert",
    is_enabled: true,
    triggers_today: 0,
  },
  {
    id: 2,
    name: "Severe Hypoxia Escalation",
    description: "Detects acute drop in blood oxygen saturation.",
    trigger_condition: "SpO2 < 90% in consecutive packets",
    action_payload: "Trigger Audio Buzzer on esp32_device_01 + SOS Notification",
    is_enabled: true,
    triggers_today: 1,
  },
  {
    id: 3,
    name: "Morning Dose Compliance Ping",
    description: "Reminder alert if morning medication is unconfirmed.",
    trigger_condition: "Morning medications unconfirmed by 09:30 AM",
    action_payload: "Push notification to patient companion device",
    is_enabled: true,
    triggers_today: 0,
  },
  {
    id: 4,
    name: "High Fever Automated Alert",
    description: "Evaluates digital thermometer reading for febrile states.",
    trigger_condition: "Body Temp > 39.0°C",
    action_payload: "Notify Home Care Nurse & Log Fever Episode in Chart",
    is_enabled: true,
    triggers_today: 0,
  },
];

export default function AutomationView() {
  const [rules, setRules] = useState<AutomationRuleItem[]>(INITIAL_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadRules = async () => {
    setLoading(true);
    const res = await fetchAutomationRules();
    if (res.ok && res.data.items && res.data.items.length > 0) {
      setRules(res.data.items);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleToggle = async (id: number, currentEnabled: boolean) => {
    setActionLoading(id);
    const nextState = !currentEnabled;
    // Optimistic local update
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_enabled: nextState } : r))
    );

    const res = await toggleAutomationRule(id, nextState);
    if (res.ok && res.data.rule) {
      setRules((prev) =>
        prev.map((r) => (r.id === id ? res.data.rule : r))
      );
    }
    setActionLoading(null);
  };

  const activeCount = rules.filter((r) => r.is_enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <Workflow className="text-cyan" size={22} />
            <h2 className="text-xl font-bold">Automation Centre</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Clinical threshold rules, edge sensor triggers, and automated notification pipelines.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={loadRules}
            disabled={loading}
            className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <div className="flex items-center gap-2">
            <Zap className="text-ok" size={16} />
            <span className="text-xs font-mono font-bold text-ok">
              {activeCount} of {rules.length} Rules Active
            </span>
          </div>
        </div>
      </section>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`glass p-6 transition duration-200 ${
              rule.is_enabled ? "border-white/15" : "border-white/5 opacity-60"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{rule.name}</h3>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      rule.is_enabled
                        ? "bg-ok/20 text-ok"
                        : "bg-muted/20 text-muted"
                    }`}
                  >
                    {rule.is_enabled ? "Active" : "Disabled"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{rule.description}</p>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 font-mono text-cyan bg-base/60 px-2.5 py-1 rounded-lg border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-muted">IF</span>
                    <span>{rule.trigger_condition}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-ok bg-base/60 px-2.5 py-1 rounded-lg border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-muted">THEN</span>
                    <span>{rule.action_payload}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center">
                <span className="text-xs text-muted font-mono">{rule.triggers_today} fired today</span>
                <button
                  onClick={() => handleToggle(rule.id, rule.is_enabled)}
                  disabled={actionLoading === rule.id}
                  className={`p-2.5 rounded-xl border transition ${
                    rule.is_enabled
                      ? "border-ok/40 bg-ok/20 text-ok hover:bg-ok/30"
                      : "border-white/10 bg-base text-muted hover:text-white"
                  }`}
                  title={rule.is_enabled ? "Disable Rule" : "Enable Rule"}
                >
                  <Power size={16} className={actionLoading === rule.id ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
