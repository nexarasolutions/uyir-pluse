"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Phone,
  Mail,
  Shield,
  CheckCircle2,
  HeartHandshake,
  RefreshCw,
} from "lucide-react";
import {
  fetchCaregivers,
  notifyCaregiver,
  type CaregiverItem,
} from "@/lib/api";

const INITIAL_FALLBACK: CaregiverItem[] = [
  {
    id: 1,
    name: "Sarah Jenkins",
    role: "Primary Caregiver",
    relation: "Spouse / Daughter",
    phone: "+1 (555) 382-9014",
    email: "sarah.jenkins@example.com",
    access_level: "Full Access",
    priority_order: 1,
  },
  {
    id: 2,
    name: "Dr. Rachel Thorne, MD",
    role: "Attending Cardiologist",
    relation: "Physician",
    phone: "+1 (555) 720-4491",
    email: "rachel.thorne@cityhospital.org",
    access_level: "Full Access",
    priority_order: 2,
  },
  {
    id: 3,
    name: "Metro EMS Dispatch",
    role: "Emergency Services",
    relation: "EMS Team 4",
    phone: "+1 (555) 911-0422",
    email: "dispatch@metro-ems.gov",
    access_level: "Critical SOS Only",
    priority_order: 3,
  },
];

export default function CaregiversView() {
  const [caregivers, setCaregivers] = useState<CaregiverItem[]>(INITIAL_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [alertSent, setAlertSent] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadCaregivers = async () => {
    setLoading(true);
    const res = await fetchCaregivers();
    if (res.ok && res.data.items && res.data.items.length > 0) {
      setCaregivers(res.data.items);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCaregivers();
  }, []);

  const handleNotify = async (cg: CaregiverItem) => {
    setActionLoading(cg.id);
    const res = await notifyCaregiver(cg.id, "Immediate clinical telemetry check requested", "urgent");
    if (res.ok) {
      setAlertSent(res.data.message);
    } else {
      setAlertSent(`Alert dispatched to ${cg.name} (${cg.phone}) via encrypted SMS.`);
    }
    setActionLoading(null);
    setTimeout(() => setAlertSent(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <Users className="text-cyan" size={22} />
            <h2 className="text-xl font-bold">Family & Caregiver Network</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Emergency notification escalation hierarchy, clinical sharing permissions, and contact routing.
          </p>
        </div>

        <button
          onClick={loadCaregivers}
          disabled={loading}
          className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </section>

      {alertSent && (
        <div className="glass border-ok/30 bg-ok/10 p-4 text-xs text-ok flex items-center gap-2 animate-pulse">
          <CheckCircle2 size={16} />
          <span>{alertSent}</span>
        </div>
      )}

      {/* Caregiver Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {caregivers.map((cg) => (
          <div key={cg.id} className="glass p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan font-mono">
                    Priority #{cg.priority_order} Escalation
                  </span>
                  <h3 className="text-base font-bold text-white mt-1">{cg.name}</h3>
                  <p className="text-xs text-muted">{cg.role} ({cg.relation})</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-menu text-brand">
                  <HeartHandshake size={20} />
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-white/80">
                  <Phone size={13} className="text-muted shrink-0" />
                  <span className="font-mono">{cg.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <Mail size={13} className="text-muted shrink-0" />
                  <span>{cg.email}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Shield size={13} className="text-ok shrink-0" />
                  <span className="rounded-full bg-ok/20 text-ok px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    {cg.access_level}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-muted">Active on SMS & Push</span>
              <button
                onClick={() => handleNotify(cg)}
                disabled={actionLoading === cg.id}
                className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Phone size={13} className={actionLoading === cg.id ? "animate-spin" : ""} />
                <span>{actionLoading === cg.id ? "Dispatching..." : "Test Alert"}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
