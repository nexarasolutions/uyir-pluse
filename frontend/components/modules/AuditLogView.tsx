"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ScrollText,
  AlertTriangle,
  CheckCircle2,
  Filter,
  RefreshCw,
  Clock,
  Shield,
  Search,
} from "lucide-react";
import { fetchAlerts, acknowledgeAlert, type AlertItem } from "@/lib/api";

export default function AuditLogView() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadAlerts = async () => {
    setLoading(true);
    const res = await fetchAlerts(50);
    if (res.ok) {
      setAlerts(res.data.items ?? []);
    }
    setLoading(false);
  };

  const handleAcknowledge = async (id: number) => {
    setActionLoading(id);
    const res = await acknowledgeAlert(id);
    if (res.ok) {
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: "acknowledged", acknowledged_at: res.data.acknowledged_at } : a
        )
      );
    }
    setActionLoading(null);
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      const matchSev = filterSeverity === "all" || a.severity === filterSeverity;
      const matchSearch =
        search === "" ||
        a.device_id.toLowerCase().includes(search.toLowerCase()) ||
        a.reason.toLowerCase().includes(search.toLowerCase());
      return matchSev && matchSearch;
    });
  }, [alerts, filterSeverity, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <ScrollText className="text-cyan" size={22} />
            <h2 className="text-xl font-bold">Activity & Clinical Audit Log</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Immutable audit record of physiological breaches, AI anomaly triggers, and device notifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAlerts}
            disabled={loading}
            className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </section>

      {/* Filter and Search */}
      <section className="glass p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="text-muted" />
          <input
            type="text"
            placeholder="Search reasons or devices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-white placeholder:text-muted focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <Filter size={14} className="text-muted" />
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-base border border-white/20 text-xs rounded-xl px-3 py-1.5 text-white outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
      </section>

      {/* Event Timeline / List */}
      <section className="glass p-6">
        {loading ? (
          <div className="space-y-3 animate-pulse p-4">
            <div className="h-12 rounded bg-white/10" />
            <div className="h-12 rounded bg-white/10" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted text-xs">
            No audit records matching criteria.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => {
              const isCrit = item.severity === "critical";
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-field border transition ${
                    isCrit ? "bg-crit/10 border-crit/30" : "bg-warn/10 border-warn/30"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isCrit ? "bg-crit/20 text-crit" : "bg-warn/20 text-warn"
                        }`}
                      >
                        {item.severity}
                      </span>
                      <span className="text-xs font-mono font-bold text-white">Event #{item.id}</span>
                      <span className="text-xs font-mono text-cyan">({item.device_id})</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted font-mono">
                      <Clock size={12} />
                      <span>{new Date(item.triggered_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <p className="text-xs text-white/90 font-medium leading-relaxed font-mono">
                    {item.reason}
                  </p>

                  <div className="mt-3 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
                    <div className="flex items-center gap-3">
                      <span>Type: <strong className="text-white font-mono">{item.alert_type}</strong></span>
                      <span className="uppercase font-semibold">
                        Status: <strong className={item.status === "acknowledged" ? "text-ok" : "text-warn"}>{item.status}</strong>
                      </span>
                    </div>

                    <div>
                      {item.status === "open" ? (
                        <button
                          onClick={() => handleAcknowledge(item.id)}
                          disabled={actionLoading === item.id}
                          className="btn-ghost text-[10px] py-1 px-2.5 rounded-lg border border-white/20 hover:border-ok hover:text-ok transition flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} className={actionLoading === item.id ? "animate-spin" : ""} />
                          <span>{actionLoading === item.id ? "Acknowledging..." : "Acknowledge"}</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-ok flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          <span>Ack {item.acknowledged_at ? new Date(item.acknowledged_at).toLocaleTimeString() : ""}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
