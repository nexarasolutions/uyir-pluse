"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, Loader2, UserCircle, CheckCircle2, WifiOff, Menu, LogOut } from "lucide-react";
import { ALL_ITEMS } from "@/lib/nav";
import { fetchReadiness, getStoredUser, clearStoredToken, type UserProfile } from "@/lib/api";

export default function Topbar({ onOpenMobile }: { onOpenMobile?: () => void }) {
  const pathname = usePathname();
  const title = ALL_ITEMS.find((i) => i.href === pathname)?.label ?? "UYIR PLUS";

  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading");
  const [statusMessage, setStatusMessage] = useState<string>("Checking backend connection...");
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

  useEffect(() => {
    let mounted = true;

    async function checkBackend() {
      const res = await fetchReadiness();
      if (!mounted) return;

      if (res.ok) {
        setStatus("connected");
        setStatusMessage(
          res.data.database === "connected"
            ? "Cloud AI & Supabase Online"
            : "Backend Online"
        );
      } else {
        setStatus("error");
        setStatusMessage(res.message);
      }
    }

    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    clearStoredToken();
    setUser(null);
  };

  return (
    <header className="flex items-center justify-between px-2 py-4">
      <div className="flex items-center gap-3">
        {onOpenMobile && (
          <button
            onClick={onOpenMobile}
            aria-label="Open navigation menu"
            className="glass p-2 md:hidden focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Menu size={20} />
          </button>
        )}
        <div>
          <p className="text-xs text-muted">Pages / {title}</p>
          <h1 className="text-lg font-bold">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Live backend connectivity probe */}
        <span
          title={statusMessage}
          className={`glass hidden sm:flex items-center gap-2 px-3 py-2 text-xs transition duration-200 ${
            status === "connected"
              ? "text-ok border-ok/30"
              : status === "loading"
              ? "text-muted"
              : "text-warn border-warn/30"
          }`}
        >
          {status === "loading" && <Loader2 size={14} className="animate-spin text-muted" />}
          {status === "connected" && <CheckCircle2 size={14} className="text-ok" />}
          {status === "error" && <WifiOff size={14} className="text-warn" />}
          <span>{statusMessage}</span>
        </span>

        {/* User Session Info */}
        {user ? (
          <div className="glass hidden md:flex items-center gap-2 px-3 py-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-cyan" />
            <span className="font-semibold text-white">{user.full_name || user.email}</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan/20 text-cyan">
              {user.role}
            </span>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="text-muted hover:text-crit ml-1 p-0.5"
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <Link
            href="/sign-in"
            className="glass hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted hover:text-cyan transition"
          >
            <UserCircle size={15} />
            <span>Sign In</span>
          </Link>
        )}

        <Link
          href="/notifications"
          aria-label="Notifications"
          className="glass p-2 hover:text-cyan transition focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Bell size={18} />
        </Link>
      </div>
    </header>
  );
}
