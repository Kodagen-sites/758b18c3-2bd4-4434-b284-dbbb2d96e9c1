"use client";

import { useActionState, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import { mockHotelConfig } from "@/data/mock-hotel";
import {
  signInWithPassword,
  sendPasswordReset,
  type ActionResult,
} from "./actions";

type Mode = "password" | "forgot";

export default function AdminLoginPage() {
  const config = mockHotelConfig;
  const [mode, setMode] = useState<Mode>("password");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");

  const [pwState, pwAction, pwPending] = useActionState<ActionResult | null, FormData>(
    signInWithPassword,
    null,
  );
  const [resetState, resetAction, resetPending] = useActionState<ActionResult | null, FormData>(
    sendPasswordReset,
    null,
  );

  return (
    <div
      className="min-h-screen flex"
      style={{
        "--color-primary": config.theme.primaryColor,
        "--color-accent": config.theme.accentColor,
        "--font-heading": config.theme.fontHeading,
      } as React.CSSProperties}
    >
      {/* Left — Hero image (desktop only) */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src={config.hero.backgroundImage}
          alt={config.businessName}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70" />
        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          <div>
            <h2
              className="text-3xl font-bold text-white mb-3"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {config.businessName}
            </h2>
            <p className="text-white/60 text-sm">Admin Panel</p>
          </div>
          <div>
            <p className="text-white/40 text-xs">&copy; {new Date().getFullYear()} {config.businessName}. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold"
              style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}
            >
              {config.businessName.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-gray-900">{config.businessName}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Admin Panel</p>
            </div>
          </div>

          {mode === "password" ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                Welcome back
              </h1>
              <p className="text-sm text-gray-500 mb-6">Sign in to manage your website.</p>

              {/* Status messages */}
              {pwState && !pwState.ok && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{pwState.error}</span>
                </motion.div>
              )}

              <form action={pwAction} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@yourbusiness.com"
                      className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 text-sm transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-12 py-3.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-sm font-medium hover:opacity-70 transition-opacity"
                    style={{ color: "var(--color-accent)" }}
                  >
                    Forgot password?
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={pwPending}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg disabled:opacity-60 disabled:hover:scale-100"
                  style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}
                >
                  {pwPending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily: "var(--font-heading)" }}>
                Reset password
              </h1>
              <p className="text-sm text-gray-500 mb-8">Enter your email and we&apos;ll send you a reset link.</p>

              <form action={resetAction} className="space-y-4">
                {resetState && !resetState.ok && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{resetState.error}</span>
                  </div>
                )}
                {resetState && resetState.ok && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{resetState.message}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@yourbusiness.com"
                      className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetPending}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-primary))` }}
                >
                  {resetPending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Send Reset Link"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setMode("password")}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Back to login
                </button>
              </form>
            </>
          )}

          <p className="text-[11px] text-gray-400 text-center mt-8 lg:hidden">
            &copy; {new Date().getFullYear()} {config.businessName}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
