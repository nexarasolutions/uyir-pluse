/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getStoredToken, getStoredUser } from "@/lib/api";

export default function SplashScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<"initial" | "scale-down" | "fade-out" | "done">("initial");

  useEffect(() => {
    setMounted(true);

    // If already seen in this session or on the sign-in page, skip splash
    try {
      const alreadySeen = sessionStorage.getItem("uyir_splash_shown");
      if (alreadySeen === "true" || pathname === "/sign-in") {
        setStage("done");
        return;
      }
    } catch {
      // Ignore
    }

    // Stage 1: Big Logo Entrance (0ms)
    // Stage 2: Smooth Zomato-style Scale Down (350ms)
    const scaleTimer = setTimeout(() => {
      setStage("scale-down");
    }, 400);

    // Stage 3: Smooth Dissolve & Smart Navigation (1500ms)
    const fadeTimer = setTimeout(() => {
      setStage("fade-out");
      try {
        sessionStorage.setItem("uyir_splash_shown", "true");
      } catch {
        // Ignore
      }

      // Check authentication status
      const hasToken = getStoredToken();
      const hasUser = getStoredUser();

      if (!hasToken && !hasUser) {
        // New user -> direct to sign up / sign in
        setTimeout(() => {
          setStage("done");
          if (pathname !== "/sign-in") {
            router.push("/sign-in");
          }
        }, 400);
      } else {
        // Logged in user -> direct to dashboard
        setTimeout(() => {
          setStage("done");
        }, 400);
      }
    }, 1500);

    return () => {
      clearTimeout(scaleTimer);
      clearTimeout(fadeTimer);
    };
  }, [pathname, router]);

  const handleSkip = () => {
    try {
      sessionStorage.setItem("uyir_splash_shown", "true");
    } catch {
      // Ignore
    }
    setStage("fade-out");
    const hasToken = getStoredToken();
    const hasUser = getStoredUser();
    setTimeout(() => {
      setStage("done");
      if (!hasToken && !hasUser && pathname !== "/sign-in") {
        router.push("/sign-in");
      }
    }, 250);
  };

  if (!mounted || stage === "done") return null;

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#060B26] select-none transition-all duration-500 cursor-pointer overflow-hidden ${
        stage === "fade-out" ? "opacity-0 scale-105 pointer-events-none" : "opacity-100"
      }`}
      aria-label="UYIR PLUS Splash Screen"
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-cyan/20 via-brand/15 to-ok/20 blur-3xl opacity-80" />
      </div>

      {/* Skip button for instant bypass */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSkip();
        }}
        className="absolute top-6 right-6 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 text-[11px] font-mono text-muted hover:text-white hover:border-white/30 backdrop-blur-md transition z-20"
      >
        Skip ✕
      </button>

      {/* Zomato-Style Big-to-Small Logo Transition Container */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
        <div
          className={`transition-all duration-700 ease-out transform ${
            stage === "initial"
              ? "scale-[1.35] opacity-90 drop-shadow-[0_0_40px_rgba(0,210,255,0.7)]"
              : "scale-[0.88] opacity-100 drop-shadow-[0_0_20px_rgba(0,210,255,0.4)]"
          }`}
        >
          <img
            src="/logo.png"
            alt="UYIR PLUS - Smart Healthcare for Brighter Tomorrows"
            className="h-24 sm:h-32 md:h-36 w-auto object-contain filter"
          />
        </div>

        {/* Minimalist Cardiac Pulse Wave Accent */}
        <div
          className={`w-48 h-6 mt-4 overflow-hidden transition-all duration-500 ${
            stage === "initial" ? "opacity-30 scale-95" : "opacity-100 scale-100"
          }`}
        >
          <svg
            viewBox="0 0 200 30"
            className="w-full h-full stroke-cyan fill-none"
            style={{ filter: "drop-shadow(0 0 6px rgba(0, 210, 255, 0.8))" }}
          >
            <path
              d="M0 15 L40 15 L50 5 L60 25 L70 8 L80 20 L90 15 L140 15 L150 5 L160 25 L170 15 L200 15"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-ecg-trace"
            />
          </svg>
        </div>

        <p
          className={`mt-2 text-[10px] sm:text-xs font-mono uppercase tracking-[0.25em] text-cyan/90 transition-all duration-500 ${
            stage === "initial" ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          }`}
        >
          Smart Healthcare for Brighter Tomorrows
        </p>
      </div>
    </div>
  );
}
