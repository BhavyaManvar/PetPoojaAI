"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LoginPage() {  const { signIn, user, loading, demoSignIn, demoMode } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (user || demoMode)) {
      router.replace("/dashboard");
    }
  }, [loading, user, demoMode, router]);

  if (loading || user || demoMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-accent" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await signIn(email, password);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface-bg">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-btn p-12">
        <div className="max-w-md">
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white text-xl font-bold">
            R
          </div>
          <h1 className="text-3xl font-semibold text-white leading-tight">
            Restaurant AI<br />
            Revenue & Voice Copilot
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">
            Enterprise-grade revenue intelligence and AI-powered voice ordering
            for modern restaurants. Optimize your menu, boost margins, and streamline
            operations.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-6">
            {[
              { label: "Menu Engineering", desc: "Star/Puzzle/Plowhorse analysis" },
              { label: "Voice Orders", desc: "AI-powered voice ordering" },
              { label: "Revenue Insights", desc: "Margin optimization" },
              { label: "Upsell Engine", desc: "Smart recommendations" },
            ].map((f) => (
              <div key={f.label} className="rounded-lg bg-white/5 p-4">
                <p className="text-sm font-medium text-white">{f.label}</p>
                <p className="mt-1 text-xs text-white/40">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-[380px]"
        >
          <div className="mb-8">
            <div className="lg:hidden mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-btn text-white text-sm font-bold">
              R
            </div>
            <h2 className="text-xl font-semibold text-text-primary">Welcome back</h2>
            <p className="mt-1.5 text-sm text-text-muted">
              Sign in to your restaurant dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-surface-border bg-white px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent placeholder:text-text-muted"
                placeholder="you@restaurant.com"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-surface-border bg-white px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent placeholder:text-text-muted"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-btn py-2.5 text-sm font-medium text-white transition-colors hover:bg-btn-hover disabled:opacity-50"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface-bg px-2 text-text-muted">or</span>
            </div>
          </div>

          <button
            onClick={() => { demoSignIn(); router.replace("/dashboard"); }}
            className="w-full rounded-lg border-2 border-accent bg-accent/5 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
          >
            🚀 Launch Demo Mode
          </button>

          <p className="mt-6 text-center text-xs text-text-muted">
            Contact your administrator to get access credentials.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
