/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, Shield, CheckCircle2, AlertCircle, Phone, Building } from "lucide-react";
import { loginUser, signupUser, getStoredUser, setStoredUser } from "@/lib/api";

export default function SignIn() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
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
        const res = await signupUser(email, password, fullName, role, phone, department);
        if (res.ok) {
          setSuccessMsg("Account successfully created! Redirecting to clinical command center...");
          setTimeout(() => router.push("/dashboard"), 1000);
        } else {
          setErrorMsg(res.message);
        }
      } else {
        const res = await loginUser(email, password);
        if (res.ok) {
          const cached = getStoredUser();
          if (cached && cached.email === email) {
            setStoredUser({
              ...res.data.user,
              full_name: res.data.user.full_name || cached.full_name,
              phone: cached.phone || res.data.user.phone,
              department: cached.department || res.data.user.department,
            });
          }
          setSuccessMsg("Authentication verified! Launching dashboard...");
          setTimeout(() => router.push("/dashboard"), 800);
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
    <main className="grid min-h-screen place-items-center p-3 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="glass page-in w-full max-w-md p-6 sm:p-8 my-auto"
        aria-labelledby="t"
      >
        <div className="flex justify-center mb-4">
          <img
            src="/logo.png"
            alt="UYIR PLUS - Smart Healthcare for Brighter Tomorrows"
            className="h-12 sm:h-16 w-auto object-contain drop-shadow-[0_4px_16px_rgba(0,210,255,0.35)]"
          />
        </div>
        <h1 id="t" className="text-center text-xl font-bold">
          {isSignUp ? "Create Clinician Account" : "Welcome back to Uyir+"}
        </h1>
        <p className="mb-5 text-center text-xs text-muted">
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
              className="field mb-3 mt-1 text-base sm:text-xs min-h-[44px]"
              placeholder="Dr. Rajesh Sharma"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-bold text-white flex items-center gap-1.5" htmlFor="phone">
                  <Phone size={13} className="text-cyan" />
                  <span>Phone Number</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="field mt-1 text-base sm:text-xs min-h-[44px]"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white flex items-center gap-1.5" htmlFor="dept">
                  <Building size={13} className="text-cyan" />
                  <span>Department / Unit</span>
                </label>
                <input
                  id="dept"
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="field mt-1 text-base sm:text-xs min-h-[44px]"
                  placeholder="Cardiac ICU Floor 3"
                />
              </div>
            </div>

            <label className="text-xs font-bold text-white flex items-center gap-1.5" htmlFor="role">
              <Shield size={13} className="text-cyan" />
              <span>Healthcare Role</span>
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "doctor" | "patient" | "nurse" | "admin")}
              className="field mb-3 mt-1 text-base sm:text-xs min-h-[44px] bg-base text-white"
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
          className="field mb-3 mt-1 text-base sm:text-xs min-h-[44px]"
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
          className="field mt-1 text-base sm:text-xs min-h-[44px]"
          placeholder="••••••••••••"
        />

        <button
          type="submit"
          disabled={loading}
          className="btn mt-6 w-full min-h-[46px] py-3 text-xs font-bold"
        >
          {loading
            ? "Verifying Credentials..."
            : isSignUp
            ? "Create Secure Account"
            : "Sign in to Uyir+"}
        </button>

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(null);
            }}
            className="hover:text-cyan transition underline py-1"
          >
            {isSignUp ? "Already have an account? Sign In" : "Need an account? Register"}
          </button>
          <Link href="/dashboard" className="hover:text-cyan transition py-1">
            Continue as Guest →
          </Link>
        </div>
      </form>
    </main>
  );
}
