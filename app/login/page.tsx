"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VedaAILogo from "@/components/ui/VedaAILogo";
import { cn } from "@/lib/utils";

// ── Icons ────────────────────────────────────────────────────────────────────

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M1 9C2.7 5.5 5.6 3 9 3s6.3 2.5 8 6c-1.7 3.5-4.6 6-8 6S2.7 12.5 1 9z" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M1 1l16 16M7.5 7.7A2.5 2.5 0 0011.3 11M4.2 4.4C2.3 5.7 1 7.2 1 9c1.7 3.5 4.6 6 8 6a8.4 8.4 0 004.6-1.4M6.6 3.3A8.7 8.7 0 019 3c3.4 0 6.3 2.5 8 6-.8 1.6-1.9 3-3.2 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.77h5.4a4.6 4.6 0 01-2 3.02v2.5h3.23c1.9-1.74 3-4.3 3-7.3z" fill="#4285F4"/>
    <path d="M10 20c2.7 0 4.97-.9 6.63-2.43l-3.24-2.51c-.9.6-2.04.96-3.39.96-2.6 0-4.8-1.76-5.6-4.12H1.07v2.6A10 10 0 0010 20z" fill="#34A853"/>
    <path d="M4.4 11.9A5.98 5.98 0 014.08 10c0-.66.11-1.3.32-1.9V5.5H1.07A10 10 0 000 10c0 1.62.39 3.15 1.07 4.5l3.33-2.6z" fill="#FBBC04"/>
    <path d="M10 3.96c1.47 0 2.79.5 3.83 1.5l2.86-2.86C14.96.9 12.7 0 10 0A10 10 0 001.07 5.5l3.33 2.6C5.2 5.72 7.4 3.96 10 3.96z" fill="#EA4335"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="1" y="1" width="7.5" height="7.5" fill="#F25022"/>
    <rect x="9.5" y="1" width="7.5" height="7.5" fill="#7FBA00"/>
    <rect x="1" y="9.5" width="7.5" height="7.5" fill="#00A4EF"/>
    <rect x="9.5" y="9.5" width="7.5" height="7.5" fill="#FFB900"/>
  </svg>
);

const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0 L9.5 6.5 L16 8 L9.5 9.5 L8 16 L6.5 9.5 L0 8 L6.5 6.5 Z"/>
  </svg>
);

// ── Decorative background dots ────────────────────────────────────────────────

function DecorativeDots() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Scattered orange sparkle dots */}
      {[
        { top: "8%",  left: "12%",  size: 6,  opacity: 0.5 },
        { top: "15%", left: "80%",  size: 4,  opacity: 0.4 },
        { top: "35%", left: "6%",   size: 5,  opacity: 0.35 },
        { top: "55%", left: "90%",  size: 7,  opacity: 0.3 },
        { top: "70%", left: "18%",  size: 4,  opacity: 0.4 },
        { top: "85%", left: "75%",  size: 5,  opacity: 0.45 },
        { top: "90%", left: "40%",  size: 3,  opacity: 0.3 },
        { top: "25%", left: "55%",  size: 3,  opacity: 0.25 },
      ].map((d, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-orange-400"
          style={{ top: d.top, left: d.left, width: d.size, height: d.size, opacity: d.opacity }}
        />
      ))}
      {/* Grid dot pattern (subtle) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.4,
        }}
      />
    </div>
  );
}

// ── Main Login Page ───────────────────────────────────────────────────────────

type Tab = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (tab === "signup" && !name) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);
    // Mock auth — just navigate to the app after a brief delay
    setTimeout(() => {
      setLoading(false);
      router.push("/");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex relative overflow-hidden">
      <DecorativeDots />

      {/* ── Left panel (brand) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-[#1a1a1a] px-16 py-12 relative overflow-hidden">
        {/* Subtle orange glow */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-orange-500 rounded-full opacity-10 blur-3xl" />
        <div className="absolute top-20 right-0 w-64 h-64 bg-orange-400 rounded-full opacity-5 blur-3xl" />

        {/* Logo */}
        <VedaAILogo size={44} showWordmark={true} wordmarkClassName="text-2xl text-white" className="relative z-10" />

        {/* Hero text */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-full px-4 py-2 mb-6">
            <SparkleIcon />
            <span className="text-orange-400 text-sm font-medium">AI Teacher&apos;s Toolkit</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Grade smarter,<br />
            <span className="text-[#E85D27]">not harder.</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Upload a question paper and student answer sheet. VedaAI extracts questions, maps handwritten answers, and highlights exactly where each answer appears.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {["Question extraction", "Answer mapping", "Region highlighting", "AI feedback"].map((f) => (
              <span key={f} className="text-xs bg-white/10 text-gray-300 rounded-full px-3 py-1.5 border border-white/10">
                ✓ {f}
              </span>
            ))}
          </div>
        </div>

        {/* School badge */}
        <div className="relative z-10 flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            DPS
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Delhi Public School</p>
            <p className="text-gray-400 text-xs">Bokaro Steel City</p>
          </div>
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <VedaAILogo size={40} showWordmark={true} wordmarkClassName="text-xl" />
        </div>

        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8">
            {/* Tab switcher */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
              {(["login", "signup"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(""); }}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
                    tab === t
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {t === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>

            {/* Heading */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {tab === "login" ? "Welcome back 👋" : "Create your account"}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {tab === "login"
                  ? "Sign in to your VedaAI account"
                  : "Start grading smarter today"}
              </p>
            </div>

            {/* Social sign-in */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button className="flex items-center justify-center gap-2.5 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
                <GoogleIcon />
                Google
              </button>
              <button className="flex items-center justify-center gap-2.5 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
                <MicrosoftIcon />
                Microsoft
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">or continue with email</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {tab === "signup" && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Madhur Rastogi"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#E85D27] focus:ring-2 focus:ring-orange-100 transition-all"
                  />
                </div>
              )}

              {tab === "signup" && (
                <div>
                  <label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-1.5">
                    School / Institution <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="school"
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="Delhi Public School"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#E85D27] focus:ring-2 focus:ring-orange-100 transition-all"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="madhur@school.edu"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#E85D27] focus:ring-2 focus:ring-orange-100 transition-all"
                  autoComplete="email"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  {tab === "login" && (
                    <button type="button" className="text-xs text-[#E85D27] hover:text-orange-700 font-medium">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === "signup" ? "Create a password (8+ chars)" : "••••••••"}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-11 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#E85D27] focus:ring-2 focus:ring-orange-100 transition-all"
                    autoComplete={tab === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 mt-2",
                  loading
                    ? "bg-gray-300 text-gray-400 cursor-not-allowed"
                    : "bg-[#1a1a1a] text-white hover:bg-[#333] active:scale-[0.98]"
                )}
              >
                {loading
                  ? "Signing in…"
                  : tab === "login"
                  ? "Sign In"
                  : "Create Account"}
              </button>
            </form>

            {/* Footer link */}
            <p className="text-center text-sm text-gray-500 mt-6">
              {tab === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button onClick={() => setTab("signup")} className="text-[#E85D27] font-semibold hover:underline">
                    Sign up free
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button onClick={() => setTab("login")} className="text-[#E85D27] font-semibold hover:underline">
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Legal */}
          <p className="text-center text-xs text-gray-400 mt-6">
            By continuing you agree to VedaAI&apos;s{" "}
            <span className="underline cursor-pointer hover:text-gray-600">Terms of Service</span>{" "}
            and{" "}
            <span className="underline cursor-pointer hover:text-gray-600">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
