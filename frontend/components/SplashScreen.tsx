/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { Activity, ShieldCheck, Cpu, CheckCircle2 } from "lucide-react";

export default function SplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("INITIALIZING SECURE TELEMETRY BUS...");
  const [isFading, setIsFading] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Only show on client
    setMounted(true);

    // Check if splash was already shown during this browser session
    try {
      const alreadyShown = sessionStorage.getItem("uyir_splash_shown");
      if (alreadyShown === "true") {
        setHidden(true);
        return;
      }
    } catch {
      // Ignore storage restrictions
    }

    const startTime = Date.now();
    const totalDuration = 1800; // 1.8 seconds total immersive experience

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentPct = Math.min(100, Math.floor((elapsed / totalDuration) * 100));
      setProgress(currentPct);

      if (currentPct < 30) {
        setStatusText("INITIALIZING SECURE TELEMETRY BUS...");
      } else if (currentPct < 65) {
        setStatusText("CONNECTING NEURAL ANOMALY DETECTOR...");
      } else if (currentPct < 90) {
        setStatusText("SYNCHRONIZING PATIENT VITALS & IOT NODES...");
      } else {
        setStatusText("SYSTEM READY — SMART HEALTHCARE FOR BRIGHTER TOMORROWS");
      }

      if (elapsed >= totalDuration) {
        clearInterval(interval);
        try {
          sessionStorage.setItem("uyir_splash_shown", "true");
        } catch {
          // Ignore
        }
        setIsFading(true);
        setTimeout(() => {
          setHidden(true);
        }, 500); // 500ms fade transition
      }
    }, 25);

    return () => clearInterval(interval);
  }, []);

  const handleSkip = () => {
    try {
      sessionStorage.setItem("uyir_splash_shown", "true");
    } catch {
      // Ignore
    }
    setIsFading(true);
    setTimeout(() => setHidden(true), 300);
  };

  if (!mounted || hidden) return null;

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#060B26] select-none transition-all duration-500 cursor-pointer ${
        isFading ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
      aria-label="UYIR PLUS Loading Screen"
      role="dialog"
      aria-modal="true"
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-radial from-cyan/20 via-brand/10 to-transparent blur-3xl animate-pulse" />
        <div className="absolute -bottom-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-radial from-ok/15 via-cyan/10 to-transparent blur-3xl" />
      </div>

      {/* Skip button in top right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSkip();
        }}
        className="absolute top-6 right-6 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 text-[11px] font-mono text-muted hover:text-white hover:border-white/30 backdrop-blur-md transition z-20"
      >
        Skip Intro ✕
      </button>

      {/* Main Content Card */}
      <div className="relative z-10 flex flex-col items-center max-w-lg px-6 text-center">
        {/* Authentic Exact Logo Container with Ambient Glow */}
        <div className="relative mb-6 group">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-cyan/30 via-brand/20 to-ok/30 blur-2xl opacity-75 animate-pulse" />
          <div className="relative bg-card/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
            <img
              src="/logo.png"
              alt="UYIR PLUS - Smart Healthcare for Brighter Tomorrows"
              className="h-20 sm:h-24 md:h-28 w-auto object-contain filter drop-shadow-[0_8px_24px_rgba(0,210,255,0.35)]"
            />
          </div>
        </div>

        {/* Dynamic ECG Heartbeat SVG Wave */}
        <div className="w-full max-w-xs h-10 mb-4 overflow-hidden relative">
          <svg
            viewBox="0 0 300 40"
            className="w-full h-full stroke-cyan fill-none"
            style={{
              filter: "drop-shadow(0 0 6px rgba(0, 210, 255, 0.75))",
            }}
          >
            <path
              d="M0 20 L60 20 L75 5 L85 35 L95 10 L105 25 L115 20 L180 20 L195 5 L205 35 L215 10 L225 25 L235 20 L300 20"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-ecg-trace"
            />
          </svg>
        </div>

        {/* Progress bar */}
        <div className="w-64 sm:w-80 h-1.5 rounded-full bg-white/10 overflow-hidden mb-3 p-[1px]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan via-brand to-ok transition-all duration-75 shadow-[0_0_12px_rgba(0,210,255,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status text & percentage */}
        <div className="flex items-center justify-between w-64 sm:w-80 text-[10px] font-mono uppercase tracking-wider text-muted">
          <span className="truncate pr-2 text-cyan font-semibold">{statusText}</span>
          <span className="text-white shrink-0">{progress}%</span>
        </div>

        {/* Security badges */}
        <div className="mt-8 flex items-center justify-center gap-4 text-[10px] text-muted/80">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-ok" />
            <span>HIPAA Compliant</span>
          </div>
          <span className="text-white/20">•</span>
          <div className="flex items-center gap-1.5">
            <Cpu size={12} className="text-cyan" />
            <span>AI Telemetry Core</span>
          </div>
          <span className="text-white/20">•</span>
          <div className="flex items-center gap-1.5">
            <Activity size={12} className="text-brand" />
            <span>Real-Time Vitals</span>
          </div>
        </div>
      </div>
    </div>
  );
}
