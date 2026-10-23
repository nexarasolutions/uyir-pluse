import type { LucideIcon } from "lucide-react";

export default function MetricCard({
  label,
  unit,
  icon: Icon,
  value,
  timestamp,
  note,
  loading,
}: {
  label: string;
  unit: string;
  icon: LucideIcon;
  value?: number | null;
  timestamp?: string;
  note?: string;
  loading?: boolean;
}) {
  const has = value !== undefined && value !== null;

  return (
    <div className="glass p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand shadow-[0_0_14px_rgba(0,117,255,.5)]">
          <Icon size={16} />
        </span>
      </div>
      {loading ? (
        <div className="mt-3 animate-pulse">
          <div className="h-7 w-20 rounded bg-white/10" />
          <div className="mt-2 h-3 w-32 rounded bg-white/10" />
        </div>
      ) : (
        <>
          <p className="mt-3 text-2xl font-bold">
            {has ? value : "—"} <span className="text-sm font-normal text-muted">{unit}</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            {has ? `Recorded ${timestamp}` : note ?? "No reading available"}
          </p>
        </>
      )}
    </div>
  );
}
