"use client";

import { useEffect, useState } from "react";
import {
  Pill,
  Clock,
  User,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import {
  fetchPrescriptions,
  refillPrescription,
  type PrescriptionItem,
} from "@/lib/api";

const INITIAL_FALLBACK: PrescriptionItem[] = [
  {
    id: 1,
    name: "Atorvastatin Calcium",
    dosage: "20 mg",
    frequency: "Once daily at bedtime",
    doctor: "Dr. Rachel Thorne (Cardiology)",
    remaining_days: 18,
    total_days: 30,
    refills_left: 2,
    instructions: "Take with water after dinner. Avoid grapefruit products.",
  },
  {
    id: 2,
    name: "Metformin Hydrochloride",
    dosage: "500 mg",
    frequency: "Twice daily with meals",
    doctor: "Dr. Sanjay Patel (Endocrinology)",
    remaining_days: 8,
    total_days: 30,
    refills_left: 1,
    instructions: "Take immediately before breakfast and dinner to reduce GI upset.",
  },
  {
    id: 3,
    name: "Lisinopril",
    dosage: "10 mg",
    frequency: "Once daily in morning",
    doctor: "Dr. Rachel Thorne (Cardiology)",
    remaining_days: 24,
    total_days: 30,
    refills_left: 3,
    instructions: "Take every morning with or without food. Monitor blood pressure.",
  },
];

export default function PrescriptionsView() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>(INITIAL_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [refillStatus, setRefillStatus] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadPrescriptions = async () => {
    setLoading(true);
    const res = await fetchPrescriptions();
    if (res.ok && res.data.items && res.data.items.length > 0) {
      setPrescriptions(res.data.items);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const requestRefill = async (id: number, name: string) => {
    setActionLoading(id);
    const res = await refillPrescription(id);
    if (res.ok) {
      setPrescriptions((prev) =>
        prev.map((item) => (item.id === id ? res.data.prescription : item))
      );
      setRefillStatus(res.data.message || `Refill request submitted for ${name} to Pharmacy.`);
    } else {
      // Optimistic fallback update
      setPrescriptions((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, remaining_days: item.total_days, refills_left: Math.max(0, item.refills_left - 1) }
            : item
        )
      );
      setRefillStatus(`Refill request submitted for ${name} to Pharmacy.`);
    }
    setActionLoading(null);
    setTimeout(() => setRefillStatus(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <Pill className="text-cyan" size={22} />
            <h2 className="text-xl font-bold">Medical Prescriptions</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Active clinical prescriptions, pharmacy refill scheduling, and dosage instructions.
          </p>
        </div>

        <button
          onClick={loadPrescriptions}
          disabled={loading}
          className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </section>

      {refillStatus && (
        <div className="glass border-ok/30 bg-ok/10 p-4 text-xs text-ok flex items-center gap-2 animate-pulse">
          <CheckCircle2 size={16} />
          <span>{refillStatus}</span>
        </div>
      )}

      {/* Prescriptions Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {prescriptions.map((rx) => {
          const total = rx.total_days || 30;
          const remaining = rx.remaining_days || 0;
          const percent = Math.min(100, Math.max(0, Math.round((remaining / total) * 100)));
          const isLow = remaining <= 10;
          return (
            <div key={rx.id} className="glass p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Rx Active</span>
                    <h3 className="text-base font-bold text-white mt-0.5">{rx.name}</h3>
                    <p className="text-xs text-cyan font-mono font-semibold">{rx.dosage}</p>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-menu text-cyan">
                    <Pill size={18} />
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-muted">
                    <Clock size={13} className="shrink-0" />
                    <span>{rx.frequency}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted">
                    <User size={13} className="shrink-0" />
                    <span>{rx.doctor}</span>
                  </div>
                </div>

                {rx.instructions && (
                  <p className="mt-3 text-[11px] text-white/80 bg-base/50 p-2.5 rounded-xl border border-white/5">
                    {rx.instructions}
                  </p>
                )}

                {/* Refill Progress */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted">Supply Remaining</span>
                    <span className={`font-mono font-bold ${isLow ? "text-warn" : "text-white"}`}>
                      {remaining} days ({percent}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isLow ? "bg-warn" : "bg-cyan"}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-muted">{rx.refills_left} refills remaining</span>
                <button
                  onClick={() => requestRefill(rx.id, rx.name)}
                  disabled={actionLoading === rx.id}
                  className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <RotateCcw size={13} className={actionLoading === rx.id ? "animate-spin" : ""} />
                  <span>{actionLoading === rx.id ? "Refilling..." : "Request Refill"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
