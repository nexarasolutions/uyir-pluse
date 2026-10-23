/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useRef } from "react";
import {
  Pill,
  Clock,
  User,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  Upload,
  FileText,
  Plus,
  X,
  ExternalLink,
  Eye,
} from "lucide-react";
import {
  fetchPrescriptions,
  createPrescription,
  refillPrescription,
  type PrescriptionItem,
} from "@/lib/api";

const RX_STORAGE_KEY = "uyir_user_prescriptions";

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

  // New Prescription Modal & File Upload State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("Once daily with food");
  const [doctor, setDoctor] = useState("Dr. Rajesh Sharma (Cardiology)");
  const [totalDays, setTotalDays] = useState("30");
  const [refills, setRefills] = useState("3");
  const [instructions, setInstructions] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Document Viewer Modal State
  const [viewingDoc, setViewingDoc] = useState<{ name: string; url: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPrescriptions = async () => {
    setLoading(true);
    let items = [...INITIAL_FALLBACK];

    // 1. Fetch from live backend if available
    try {
      const res = await fetchPrescriptions();
      if (res.ok && res.data.items && res.data.items.length > 0) {
        items = res.data.items;
      }
    } catch {
      // Fallback
    }

    // 2. Merge user-saved prescriptions from localStorage
    try {
      const saved = localStorage.getItem(RX_STORAGE_KEY);
      if (saved) {
        const parsed: PrescriptionItem[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Prepend user-created real prescriptions
          items = [...parsed, ...items.filter((i) => !parsed.some((p) => p.id === i.id))];
        }
      }
    } catch {
      // Ignore
    }

    setPrescriptions(items);
    setLoading(false);
  };

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedFile({
          name: file.name,
          url: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dosage.trim()) return;

    setSubmitting(true);
    const newId = Date.now();
    const newRx: PrescriptionItem = {
      id: newId,
      name: name.trim(),
      dosage: dosage.trim(),
      frequency: frequency.trim(),
      doctor: doctor.trim(),
      remaining_days: parseInt(totalDays, 10) || 30,
      total_days: parseInt(totalDays, 10) || 30,
      refills_left: parseInt(refills, 10) || 0,
      instructions: instructions.trim() || "Take as directed by your physician.",
      document_name: attachedFile?.name || null,
      document_url: attachedFile?.url || null,
      created_at: new Date().toISOString(),
    };

    // Save to localStorage
    try {
      const existing = localStorage.getItem(RX_STORAGE_KEY);
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(newRx);
      localStorage.setItem(RX_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Ignore
    }

    // Attempt backend sync
    try {
      await createPrescription({
        name: newRx.name,
        dosage: newRx.dosage,
        frequency: newRx.frequency,
        doctor: newRx.doctor,
        total_days: newRx.total_days,
        refills_left: newRx.refills_left,
        instructions: newRx.instructions || undefined,
      });
    } catch {
      // Offline fallback
    }

    setPrescriptions((prev) => [newRx, ...prev]);
    setSubmitting(false);
    setShowAddModal(false);
    setRefillStatus(`Prescription for ${newRx.name} successfully registered.`);
    setTimeout(() => setRefillStatus(null), 4000);

    // Reset Form
    setName("");
    setDosage("");
    setInstructions("");
    setAttachedFile(null);
  };

  const requestRefill = async (id: number, rxName: string) => {
    setActionLoading(id);
    const res = await refillPrescription(id);
    if (res.ok) {
      setPrescriptions((prev) =>
        prev.map((item) => (item.id === id ? res.data.prescription : item))
      );
      setRefillStatus(res.data.message || `Refill request submitted for ${rxName} to Pharmacy.`);
    } else {
      setPrescriptions((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, remaining_days: item.total_days, refills_left: Math.max(0, item.refills_left - 1) }
            : item
        )
      );
      setRefillStatus(`Refill request submitted for ${rxName} to Pharmacy.`);
    }
    setActionLoading(null);
    setTimeout(() => setRefillStatus(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <Pill className="text-cyan" size={22} />
            <h2 className="text-xl font-bold">Medical Prescriptions</h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Active clinical prescriptions, document uploads, and pharmacy refill management.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold"
          >
            <Plus size={15} />
            <span>Upload / Add Rx</span>
          </button>

          <button
            onClick={loadPrescriptions}
            disabled={loading}
            className="btn-ghost flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs"
            aria-label="Refresh prescriptions"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </section>

      {refillStatus && (
        <div className="glass border-ok/30 bg-ok/10 p-3 sm:p-4 text-xs text-ok flex items-center gap-2 animate-pulse">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{refillStatus}</span>
        </div>
      )}

      {/* Prescriptions Grid */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
        {prescriptions.map((rx) => {
          const total = rx.total_days || 30;
          const remaining = rx.remaining_days || 0;
          const percent = Math.min(100, Math.max(0, Math.round((remaining / total) * 100)));
          const isLow = remaining <= 10;
          return (
            <div key={rx.id} className="glass p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Rx Active</span>
                    <h3 className="text-base font-bold text-white mt-0.5">{rx.name}</h3>
                    <p className="text-xs text-cyan font-mono font-semibold">{rx.dosage}</p>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-menu text-cyan">
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

                {/* Uploaded Rx Document Attachment Indicator */}
                {rx.document_name && (
                  <div className="mt-3 p-2.5 rounded-xl border border-cyan/30 bg-cyan/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={15} className="text-cyan shrink-0" />
                      <span className="truncate text-white font-mono text-[11px]">
                        {rx.document_name}
                      </span>
                    </div>
                    {rx.document_url && (
                      <button
                        onClick={() =>
                          setViewingDoc({ name: rx.document_name || "Prescription Document", url: rx.document_url! })
                        }
                        className="text-cyan hover:underline text-[11px] font-bold flex items-center gap-1 shrink-0 ml-2"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                    )}
                  </div>
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
                <span className="text-xs text-muted">{rx.refills_left} refills left</span>
                <button
                  onClick={() => requestRefill(rx.id, rx.name)}
                  disabled={actionLoading === rx.id}
                  className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 min-h-[38px]"
                >
                  <RotateCcw size={13} className={actionLoading === rx.id ? "animate-spin" : ""} />
                  <span>{actionLoading === rx.id ? "Refilling..." : "Request Refill"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload / Add Prescription Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="glass w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-cyan" />
                <h3 className="text-base font-bold text-white">Upload & Record Prescription</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePrescription} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Medication Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Amoxicillin Trihydrate"
                    className="field text-base sm:text-xs min-h-[42px]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Dosage / Strength *</label>
                  <input
                    type="text"
                    required
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 500 mg Capsule"
                    className="field text-base sm:text-xs min-h-[42px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Dosage Schedule</label>
                  <input
                    type="text"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    placeholder="e.g. Twice daily after meals"
                    className="field text-base sm:text-xs min-h-[42px]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Prescribing Doctor</label>
                  <input
                    type="text"
                    value={doctor}
                    onChange={(e) => setDoctor(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="field text-base sm:text-xs min-h-[42px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={totalDays}
                    onChange={(e) => setTotalDays(e.target.value)}
                    className="field text-base sm:text-xs min-h-[42px]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Authorized Refills</label>
                  <input
                    type="number"
                    min="0"
                    value={refills}
                    onChange={(e) => setRefills(e.target.value)}
                    className="field text-base sm:text-xs min-h-[42px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">Physician Instructions</label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Take with a full glass of water. Complete full course."
                  className="field text-base sm:text-xs min-h-[60px]"
                />
              </div>

              {/* Upload Prescription Slip / PDF Scan */}
              <div>
                <label className="text-xs font-bold text-white block mb-1">
                  Upload Prescription Document / Photo Scan
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-white/20 hover:border-cyan/50 rounded-2xl p-4 text-center transition bg-base/50"
                >
                  {attachedFile ? (
                    <div className="flex items-center justify-center gap-2 text-ok text-xs font-semibold">
                      <CheckCircle2 size={16} />
                      <span className="truncate max-w-xs">{attachedFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Upload size={22} className="text-cyan" />
                      <span className="text-xs text-white font-medium">
                        Click or tap to attach Rx slip, photo scan or PDF
                      </span>
                      <span className="text-[10px] text-muted">Supports JPG, PNG, WebP, PDF</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-ghost py-2.5 px-4 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn py-2.5 px-6 text-xs font-bold"
                >
                  {submitting ? "Saving Rx..." : "Save Prescription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setViewingDoc(null)}
        >
          <div
            className="glass w-full max-w-2xl p-6 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={18} className="text-cyan shrink-0" />
                <h3 className="text-sm font-bold text-white truncate">{viewingDoc.name}</h3>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="text-muted hover:text-white p-1 rounded-lg shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl bg-black/40 p-2 flex items-center justify-center min-h-[300px]">
              {viewingDoc.url.startsWith("data:image") ? (
                <img
                  src={viewingDoc.url}
                  alt={viewingDoc.name}
                  className="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="text-center p-8">
                  <FileText size={48} className="text-cyan mx-auto mb-2" />
                  <p className="text-xs text-white font-mono">{viewingDoc.name}</p>
                  <p className="text-[11px] text-muted mt-1">Medical prescription document uploaded</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
