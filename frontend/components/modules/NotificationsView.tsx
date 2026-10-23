"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  ShieldAlert,
  RefreshCw,
  Check,
} from "lucide-react";
import { fetchAlerts, acknowledgeAlert, type AlertItem } from "@/lib/api";

interface NotificationItem {
  id: string;
  rawId: number;
  category: "alert" | "medication" | "system";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  severity: string;
}

export default function NotificationsView() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    const res = await fetchAlerts(50);
    if (res.ok && res.data.items) {
      const mapped: NotificationItem[] = res.data.items.map((item: AlertItem) => {
        let cat: "alert" | "medication" | "system" = "alert";
        if (item.alert_type === "hardware_actuation" || item.alert_type === "system" || item.alert_type === "DEVICE_COMMAND") {
          cat = "system";
        } else if (item.alert_type === "medication") {
          cat = "medication";
        }

        let title = "Clinical Alert";
        if (item.severity === "critical") {
          title = "Critical Vital Anomaly";
        } else if (item.alert_type === "MANUAL_SOS") {
          title = "Emergency SOS Alert";
        } else if (item.alert_type === "hardware_actuation" || item.alert_type === "DEVICE_COMMAND") {
          title = "IoT Hardware Command Event";
        } else if (item.alert_type === "vital_anomaly") {
          title = "Physiological Vital Alert";
        }

        const isRead = item.status === "acknowledged" || item.status === "resolved";
        const dateStr = item.triggered_at
          ? new Date(item.triggered_at).toLocaleString()
          : "Recently";

        return {
          id: `alert-${item.id}`,
          rawId: item.id,
          category: cat,
          title,
          message: item.reason,
          timestamp: dateStr,
          read: isRead,
          severity: item.severity,
        };
      });
      setNotifications(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const markAllRead = async () => {
    setMarkingAll(true);
    const unread = notifications.filter((n) => !n.read);
    await Promise.allSettled(unread.map((n) => acknowledgeAlert(n.rawId)));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setMarkingAll(false);
    setFeedback("All clinical notifications marked as read.");
    setTimeout(() => setFeedback(null), 3500);
  };

  const acknowledgeSingle = async (rawId: number) => {
    const res = await acknowledgeAlert(rawId);
    if (res.ok) {
      setNotifications((prev) =>
        prev.map((n) => (n.rawId === rawId ? { ...n, read: true } : n))
      );
      setFeedback(`Alert #${rawId} acknowledged.`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const filtered = notifications.filter(
    (n) => filter === "all" || n.category === filter
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="text-cyan" size={22} />
            <h2 className="text-xl font-bold">Notifications Centre</h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-crit/20 border border-crit/30 text-crit px-2 py-0.5 text-xs font-bold font-mono">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            Clinical threshold alerts, medication dosing alerts, and edge hardware sync updates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAlerts}
            disabled={loading}
            className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Poll Alerts</span>
          </button>
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0 || markingAll}
            className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs"
          >
            <CheckCircle2 size={14} className={markingAll ? "animate-spin" : ""} />
            <span>Mark All Read</span>
          </button>
          <button
            onClick={clearAll}
            disabled={notifications.length === 0}
            className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs text-muted hover:text-crit"
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
        </div>
      </section>

      {feedback && (
        <div className="glass border-ok/30 bg-ok/10 p-4 text-xs text-ok flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="glass flex gap-1 p-1.5 max-w-md">
        {["all", "alert", "medication", "system"].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`flex-1 rounded-xl py-1.5 text-xs font-bold capitalize transition duration-200 ${
              filter === cat ? "bg-white/15 text-white" : "text-muted hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <section className="space-y-3">
        {loading && notifications.length === 0 ? (
          <div className="glass p-8 text-center text-xs text-muted flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin text-cyan" />
            <span>Loading notifications from clinical datastore...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass p-8 text-center text-xs text-muted">
            No notifications in this category.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={`glass p-4 flex items-start justify-between gap-4 transition duration-200 ${
                !item.read ? "border-brand/40 bg-brand/5" : "border-white/5 opacity-80"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white ${
                    item.severity === "critical"
                      ? "bg-crit"
                      : item.category === "alert"
                      ? "bg-warn"
                      : item.category === "medication"
                      ? "bg-cyan"
                      : "bg-menu text-brand"
                  }`}
                >
                  {item.category === "alert" && <AlertTriangle size={16} />}
                  {item.category === "medication" && <Clock size={16} />}
                  {item.category === "system" && <ShieldAlert size={16} />}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white">{item.title}</h4>
                    {!item.read && (
                      <span className="h-2 w-2 rounded-full bg-brand shrink-0" />
                    )}
                    {item.read && (
                      <span className="text-[10px] text-ok flex items-center gap-1 font-mono">
                        <Check size={12} /> Acknowledged
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-white/80 leading-relaxed font-mono">
                    {item.message}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-[11px] text-muted font-mono">
                  {item.timestamp}
                </span>
                {!item.read && (
                  <button
                    onClick={() => acknowledgeSingle(item.rawId)}
                    className="btn-ghost text-[10px] py-1 px-2.5 flex items-center gap-1 text-cyan hover:text-white"
                  >
                    <Check size={12} />
                    <span>Acknowledge</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
