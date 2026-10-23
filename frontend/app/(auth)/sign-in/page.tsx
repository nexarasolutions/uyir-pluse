/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartPulse, Lock, Mail, User, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { loginUser, signupUser } from "@/lib/api";

export default function SignIn() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"doctor" | "patient" | "nurse" | "admin">("doctor");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const res = await signupUser(email, password, fullName, role);
        if (res.ok) {
          setSuccessMsg("Account successfully created! Redirecting to clinical command center...");
          setTimeout(() => router.push("/dashboard"), 1200);
        } else {
          setErrorMsg(res.message);
        }
      } else {
        const res = await loginUser(email, password);
        if (res.ok) {
          setSuccessMsg("Authentication verified! Launching dashboard...");
          setTimeout(() => router.push("/dashboard"), 1000);
        } else {
          setErrorMsg(res.message);
        }
      }
    } catch {
      setErrorMsg("An unexpected connection error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <form onSubmit={handleSubmit} className="glass page-in w-full max-w-md p-8" aria-labelledby="t">
        <div className="flex justify-center mb-5">
          <img
            src="/logo.png"
            alt="UYIR PLUS - Smart Healthcare for Brighter Tomorrows"
            className="h-14 sm:h-16 w-auto object-contain drop-shadow-[0_4px_16px_rgba(0,210,255,0.35)]"
          />
        </div>
        <h1 id="t" className="text-center text-xl font-bold">
          {isSignUp ? "Create Clinician Account" : "Welcome back to Uyir+"}
        </h1>
        <p className="mb-6 text-center text-xs text-muted">
          Smart Healthcare for Brighter Tomorrows
        </p>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-crit/40 bg-crit/15 p-3 text-xs text-crit">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-ok/40 bg-ok/15 p-3 text-xs text-ok">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {isSignUp && (
          <>
            <label className="text-xs font-bold text-white flex items-center gap-1.5" htmlFor="name">
              <User size={13} className="text-cyan" />
              <span>Full Name</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="field mb-4 mt-1 text-xs"
              placeholder="Dr. Rajesh Sharma"
            />

            <label className="text-xs font-bold text-white flex items-center gap-1.5" htmlFor="role">
              <Shield size={13} className="text-cyan" />
              <span>Healthcare Role</span>
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "doctor" | "patient" | "nurse" | "admin")}
              className="field mb-4 mt-1 text-xs bg-base text-white"
            >
              <option value="doctor">Attending Physician / Doctor</option>
              <option value="nurse">Clinical Nurse / Responder</option>
              <option value="patient">Monitored Patient</option>
              <option value="admin">System Administrator</option>
            </select>
          </>
        )}

        <label className="text-xs font-bold text-white flex items-center gap-1.5" htmlFor="e">
          <Mail size={13} className="text-cyan" />
          <span>Email Address</span>
        </label>
        <input
          id="e"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field mb-4 mt-1 text-xs"
          placeholder="doctor.sharma@hospital-uyir.org"
        />

        <label className="text-xs font-bold text-white flex items-center gap-1.5" htmlFor="p">
          <Lock size={13} className="text-cyan" />
          <span>Password</span>
        </label>
        <input
          id="p"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field mt-1 text-xs"
          placeholder="••••••••••••"
        />

        <button
          type="submit"
          disabled={loading}
          className="btn mt-6 w-full py-2.5 text-xs font-bold"
        >
          {loading
            ? "Verifying Credentials..."
            : isSignUp
            ? "Create Secure Account"
            : "Sign in to Uyir+"}
        </button>

        <div className="mt-4 flex items-center justify-between text-[11px] text-muted">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(null);
            }}
            className="hover:text-cyan transition underline"
          >
            {isSignUp ? "Already have an account? Sign In" : "Need an account? Register"}
          </button>
          <Link href="/dashboard" className="hover:text-cyan transition">
            Continue as Guest →
          </Link>
        </div>
      </form>
    </main>
  );
}
