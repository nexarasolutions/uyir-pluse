/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartPulse, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { NAV } from "@/lib/nav";

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const path = usePathname();

  const navContent = (
    <>
      <div className="flex items-center justify-between px-2 pb-4 border-b border-white/10">
        <div className="flex items-center">
          {(!collapsed || mobileOpen) ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 transition duration-200 group hover:opacity-95"
            >
              <img
                src="/logo.png"
                alt="UYIR PLUS"
                className="h-10 w-auto max-w-[195px] object-contain drop-shadow-[0_2px_10px_rgba(0,210,255,0.25)]"
              />
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="h-10 w-10 mx-auto rounded-xl overflow-hidden flex items-center justify-center bg-card/80 border border-white/10 hover:border-cyan/50 shadow-sm transition"
              title="UYIR PLUS - Dashboard"
            >
              <img
                src="/logo.png"
                alt="UYIR PLUS"
                className="h-9 w-auto max-w-none object-left object-contain"
                style={{ transform: "scale(2.4) translateX(11px)" }}
              />
            </Link>
          )}
        </div>
        {mobileOpen && (
          <button
            onClick={onCloseMobile}
            className="md:hidden text-muted hover:text-white p-1 rounded-lg"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="mt-4 flex-1 space-y-4">
        {NAV.map((g) => (
          <div key={g.group}>
            {(!collapsed || mobileOpen) && (
              <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-widest text-muted">
                {g.group}
              </p>
            )}
            <ul className="space-y-1">
              {g.items.map(({ label, href, icon: Icon }) => {
                const active = path === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onCloseMobile}
                      title={collapsed && !mobileOpen ? label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-field px-3 py-2 text-sm transition duration-200 focus-visible:ring-2 focus-visible:ring-brand ${
                        active ? "bg-white/10 font-bold text-white" : "text-muted hover:text-white"
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                          active
                            ? "bg-brand text-white shadow-[0_0_14px_rgba(0,117,255,.6)]"
                            : "bg-menu text-brand"
                        }`}
                      >
                        <Icon size={16} />
                      </span>
                      {(!collapsed || mobileOpen) && <span>{label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <button
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="mt-2 hidden md:flex items-center justify-center rounded-field p-2 text-muted hover:text-white focus-visible:ring-2 focus-visible:ring-brand"
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        aria-label="Primary"
        className={`glass hidden md:flex flex-col m-4 mr-0 p-4 sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto transition-all duration-300 ${
          collapsed ? "w-[84px]" : "w-[260px]"
        }`}
      >
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-fade-in"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        aria-label="Mobile Navigation"
        className={`fixed top-0 bottom-0 left-0 z-50 w-[280px] p-5 flex flex-col bg-card border-r border-white/10 overflow-y-auto transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
