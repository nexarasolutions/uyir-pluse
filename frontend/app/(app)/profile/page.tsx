"use client";

import { useEffect, useState } from "react";
import {
  UserCircle,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Calendar,
  Shield,
} from "lucide-react";
import { getStoredUser, fetchUserProfile, type UserProfile } from "@/lib/api";

const TABS = ["Overview", "Consent", "Notifications"] as const;

export default function Profile() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [user, setUser] = useState<UserProfile | null>(null);

  // Persistent preferences loaded from localStorage
  const [researchConsent, setResearchConsent] = useState(true);
  const [emergencyConsent, setEmergencyConsent] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editEmergency, setEditEmergency] = useState("");

  useEffect(() => {
    // 1. Initial cached user
    const local = getStoredUser();
    if (local) {
      setUser(local);
      setEditName(local.full_name || "");
      setEditPhone(local.phone || "");
      setEditDept(local.department || "");
      setEditEmergency(local.emergency_contact || "");
    }

    // 2. Fetch fresh profile from backend
    fetchUserProfile().then((res) => {
      if (res.ok && res.data) {
        setUser((prev) => {
          const merged = { ...res.data, ...prev };
          return merged;
        });
      }
    });

    // 3. Load saved preferences
    if (typeof window !== "undefined") {
      try {
        const storedPrefs = localStorage.getItem("uyir_profile_prefs");
        if (storedPrefs) {
          const parsed = JSON.parse(storedPrefs);
          if (parsed.researchConsent !== undefined) setResearchConsent(parsed.researchConsent);
          if (parsed.emergencyConsent !== undefined) setEmergencyConsent(parsed.emergencyConsent);
          if (parsed.smsAlerts !== undefined) setSmsAlerts(parsed.smsAlerts);
          if (parsed.pushAlerts !== undefined) setPushAlerts(parsed.pushAlerts);
          if (parsed.emailDigest !== undefined) setEmailDigest(parsed.emailDigest);
        }
      } catch {
        // ignore fallback
      }
    }
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      full_name: editName.trim() || user.full_name,
      phone: editPhone.trim() || user.phone,
      department: editDept.trim() || user.department,
      emergency_contact: editEmergency.trim() || user.emergency_contact,
    };
    setUser(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("uyir_auth_user", JSON.stringify(updated));
    }
    setIsEditing(false);
    setSavedFeedback("Clinical profile details updated successfully.");
    setTimeout(() => setSavedFeedback(null), 3000);
  };

  const savePrefs = (updates: Record<string, boolean>) => {
    if (typeof window !== "undefined") {
      const current = {
        researchConsent,
        emergencyConsent,
        smsAlerts,
        pushAlerts,
        emailDigest,
        ...updates,
      };
      localStorage.setItem("uyir_profile_prefs", JSON.stringify(current));
      setSavedFeedback("Preferences saved and synchronized.");
      setTimeout(() => setSavedFeedback(null), 3000);
    }
  };

  const displayName = user?.full_name || "Alexander Bennett";
  const displayEmail = user?.email || "patient_1001@uyir.org";
  const displayRole = user?.role || "patient";
  const displayPhone = user?.phone || "+91 98765 43210";
  const displayDept = user?.department || "Cardiac Telemetry & Vital Monitoring";
  const displayEmergency = user?.emergency_contact || "+91 91100 88990 (EMS Zone 4)";

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <section className="glass flex flex-wrap items-center justify-between gap-4 sm:gap-6 p-4 sm:p-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative">
            <span className="grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-2xl bg-menu text-cyan shadow-[0_0_20px_rgba(0,117,255,.5)]">
              <UserCircle size={44} />
            </span>
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-ok border-2 border-base" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">{displayName}</h2>
              <span className="rounded-full bg-cyan/20 text-cyan px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono">
                {displayRole}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5 break-all">
              Email: <span className="font-mono text-white">{displayEmail}</span> • Node:{" "}
              <span className="font-mono text-cyan font-semibold">esp32_device_01</span>
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div role="tablist" className="glass flex gap-1 p-1 w-full sm:w-auto justify-center">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex-1 sm:flex-none rounded-xl px-3 sm:px-4 py-2 text-xs font-bold transition duration-200 ${
                tab === t ? "bg-white/15 text-white" : "text-muted hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {savedFeedback && (
        <div className="glass border-ok/30 bg-ok/10 p-3 text-xs text-ok flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{savedFeedback}</span>
        </div>
      )}

      {/* Tab Panels */}
      {tab === "Overview" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Account & Role Card */}
            <section className="glass p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-muted">
                  Account & Clinical Metadata
                </h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs text-cyan hover:underline font-bold"
                >
                  {isEditing ? "Cancel" : "Edit Profile"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs">
                <div className="rounded-xl border border-white/10 bg-base/50 p-3">
                  <span className="text-muted text-[11px]">Primary Role</span>
                  <p className="font-bold text-white mt-1 uppercase font-mono">{displayRole}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-base/50 p-3">
                  <span className="text-muted text-[11px]">Assigned IoT Node</span>
                  <p className="font-bold text-cyan mt-1 font-mono">esp32_device_01</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-base/50 p-3">
                  <span className="text-muted text-[11px]">Department / Unit</span>
                  <p className="font-bold text-white mt-1 truncate">{displayDept}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-base/50 p-3">
                  <span className="text-muted text-[11px]">Account Status</span>
                  <p className="font-bold text-ok mt-1">Active Verified</p>
                </div>
              </div>
            </section>

            {/* Contact Details Card */}
            <section className="glass p-5 sm:p-6">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted mb-4">
                Contact & Communication Lines
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-base/50">
                  <Mail size={14} className="text-cyan shrink-0" />
                  <span className="text-white font-mono break-all">{displayEmail}</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-base/50">
                  <Phone size={14} className="text-cyan shrink-0" />
                  <span className="font-mono text-white">{displayPhone}</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-base/50">
                  <MapPin size={14} className="text-cyan shrink-0" />
                  <span className="text-white">{displayDept}</span>
                </div>
              </div>
            </section>
          </div>

          {/* Edit Profile Form */}
          {isEditing && (
            <form onSubmit={handleSaveProfile} className="glass p-5 sm:p-6 space-y-4 animate-fade-in">
              <h3 className="font-bold text-sm text-white">Update Real Profile Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="field text-base sm:text-xs min-h-[42px]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="field text-base sm:text-xs min-h-[42px]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Department / Hospital Unit</label>
                  <input
                    type="text"
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    className="field text-base sm:text-xs min-h-[42px]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Emergency Careline Contact</label>
                  <input
                    type="text"
                    value={editEmergency}
                    onChange={(e) => setEditEmergency(e.target.value)}
                    className="field text-base sm:text-xs min-h-[42px]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn-ghost py-2 px-4 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn py-2 px-6 text-xs font-bold">
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {tab === "Consent" && (
        <section className="glass p-6 space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-muted mb-2">Privacy & Telemetry Sharing Consents</h3>
          <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-base/50">
            <div>
              <h4 className="text-sm font-bold text-white">Emergency Dispatch Telemetry Forwarding</h4>
              <p className="text-xs text-muted mt-0.5">Authorizes sharing vital signs with medical first responders.</p>
            </div>
            <input
              type="checkbox"
              checked={emergencyConsent}
              onChange={(e) => {
                setEmergencyConsent(e.target.checked);
                savePrefs({ emergencyConsent: e.target.checked });
              }}
              className="h-5 w-5 accent-brand cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-base/50">
            <div>
              <h4 className="text-sm font-bold text-white">De-Identified Cardiorespiratory Research</h4>
              <p className="text-xs text-muted mt-0.5">Allows non-identifiable pulse metrics to inform clinical trials.</p>
            </div>
            <input
              type="checkbox"
              checked={researchConsent}
              onChange={(e) => {
                setResearchConsent(e.target.checked);
                savePrefs({ researchConsent: e.target.checked });
              }}
              className="h-5 w-5 accent-brand cursor-pointer"
            />
          </div>
        </section>
      )}

      {tab === "Notifications" && (
        <section className="glass p-6 space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-muted mb-2">Notification Delivery Channels</h3>
          <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-base/50">
            <div>
              <h4 className="text-sm font-bold text-white">SMS Critical Threshold Alerts</h4>
              <p className="text-xs text-muted mt-0.5">Instant text message delivery when acute tachycardia or hypoxemia occurs.</p>
            </div>
            <input
              type="checkbox"
              checked={smsAlerts}
              onChange={(e) => {
                setSmsAlerts(e.target.checked);
                savePrefs({ smsAlerts: e.target.checked });
              }}
              className="h-5 w-5 accent-brand cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-base/50">
            <div>
              <h4 className="text-sm font-bold text-white">Push Notifications (Mobile & Web)</h4>
              <p className="text-xs text-muted mt-0.5">Browser and mobile alerts for medication timing and sensor sync.</p>
            </div>
            <input
              type="checkbox"
              checked={pushAlerts}
              onChange={(e) => {
                setPushAlerts(e.target.checked);
                savePrefs({ pushAlerts: e.target.checked });
              }}
              className="h-5 w-5 accent-brand cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-base/50">
            <div>
              <h4 className="text-sm font-bold text-white">Weekly Diagnostic Email Digest</h4>
              <p className="text-xs text-muted mt-0.5">Summary of weekly mean heart rate, oxygenation, and stability scores.</p>
            </div>
            <input
              type="checkbox"
              checked={emailDigest}
              onChange={(e) => {
                setEmailDigest(e.target.checked);
                savePrefs({ emailDigest: e.target.checked });
              }}
              className="h-5 w-5 accent-brand cursor-pointer"
            />
          </div>
        </section>
      )}
    </div>
  );
}
