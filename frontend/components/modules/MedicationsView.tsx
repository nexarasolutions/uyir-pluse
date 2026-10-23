"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Sun,
  Sunset,
  Moon,
  Check,
  RefreshCw,
} from "lucide-react";
import {
  fetchMedications,
  toggleMedication,
  type MedicationDoseItem,
} from "@/lib/api";

const INITIAL_FALLBACK: MedicationDoseItem[] = [
  {
    id: 1,
    time_slot: "Morning",
    time_str: "08:00 AM",
    medication_name: "Lisinopril",
    dosage: "10 mg",
    taken: true,
    notes: "Take with full glass of water",
  },
  {
    id: 2,
    time_slot: "Morning",
    time_str: "08:30 AM",
    medication_name: "Metformin Hydrochloride",
    dosage: "500 mg",
    taken: true,
    notes: "With breakfast",
  },
  {
    id: 3,
    time_slot: "Afternoon",
    time_str: "01:00 PM",
    medication_name: "Multivitamin & CoQ10",
    dosage: "1 Capsule",
    taken: false,
    notes: "With lunch",
  },
  {
    id: 4,
    time_slot: "Evening",
    time_str: "08:00 PM",
    medication_name: "Metformin Hydrochloride",
    dosage: "500 mg",
    taken: false,
    notes: "With dinner",
  },
  {
    id: 5,
    time_slot: "Night",
    time_str: "09:30 PM",
    medication_name: "Atorvastatin Calcium",
    dosage: "20 mg",
    taken: false,
    notes: "Before bedtime",
  },
];

export default function MedicationsView() {
  const [doses, setDoses] = useState<MedicationDoseItem[]>(INITIAL_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadDoses = async () => {
    setLoading(true);
    const res = await fetchMedications();
    if (res.ok && res.data.items && res.data.items.length > 0) {
      setDoses(res.data.items);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDoses();
  }, []);

  const handleToggle = async (id: number, currentTaken: boolean) => {
    setActionLoading(id);
    const nextTaken = !currentTaken;
    // Optimistic local update
    setDoses((prev) =>
      prev.map((d) => (d.id === id ? { ...d, taken: nextTaken } : d))
    );

    const res = await toggleMedication(id, nextTaken);
    if (res.ok && res.data.medication) {
      setDoses((prev) =>
        prev.map((d) => (d.id === id ? res.data.medication : d))
      );
    }
    setActionLoading(null);
  };

  const takenCount = doses.filter((d) => d.taken).length;
  const progressPercent = doses.length > 0 ? Math.round((takenCount / doses.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="text-cyan" size={22} />
            <h2 className="text-xl font-bold">Medication Schedule & Adherence</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Daily dosage checklist, time slot tracking, and patient adherence timeline.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={loadDoses}
            disabled={loading}
            className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <div className="text-right">
            <p className="text-xs text-muted">Today&apos;s Adherence</p>
            <p className="text-lg font-bold text-ok font-mono">{takenCount} / {doses.length} Doses ({progressPercent}%)</p>
          </div>
        </div>
      </section>

      {/* Progress Bar */}
      <section className="glass p-5">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-muted font-medium">Daily Completion Goal</span>
          <span className="font-mono text-cyan font-bold">{progressPercent}% Completed</span>
        </div>
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </section>

      {/* Schedule Items */}
      <section className="space-y-4">
        {doses.map((dose) => {
          return (
            <div
              key={dose.id}
              className={`glass p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition duration-200 ${
                dose.taken ? "border-ok/30 bg-ok/5" : "border-white/10"
              }`}
            >
              <div className="flex items-start sm:items-center gap-4">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  dose.time_slot === "Morning"
                    ? "bg-warn/20 text-warn"
                    : dose.time_slot === "Afternoon"
                    ? "bg-cyan/20 text-cyan"
                    : "bg-violet/20 text-violet"
                }`}>
                  {dose.time_slot === "Morning" && <Sun size={18} />}
                  {dose.time_slot === "Afternoon" && <Sunset size={18} />}
                  {(dose.time_slot === "Evening" || dose.time_slot === "Night") && <Moon size={18} />}
                </span>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan">{dose.time_str}</span>
                    <span className="text-xs text-muted">• {dose.time_slot}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-0.5">{dose.medication_name}</h4>
                  <p className="text-xs text-muted">
                    Dosage: <span className="text-white font-medium">{dose.dosage}</span> {dose.notes ? `• ${dose.notes}` : ""}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleToggle(dose.id, dose.taken)}
                disabled={actionLoading === dose.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  dose.taken
                    ? "bg-ok text-white hover:opacity-90"
                    : "btn-ghost"
                }`}
              >
                {dose.taken ? (
                  <>
                    <Check size={14} className={actionLoading === dose.id ? "animate-spin" : ""} />
                    <span>Completed</span>
                  </>
                ) : (
                  <span>Mark as Taken</span>
                )}
              </button>
            </div>
          );
        })}
      </section>
    </div>
  );
}
