"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth as getAuth, db as getDb } from "@/lib/firebase";

export default function SignupPage() {
  const { user, loading, demoMode } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "admin">("customer");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && (user || demoMode)) {
    const dest = role === "admin" ? "/admin" : "/order";
    router.replace(dest);
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const cred = await createUserWithEmailAndPassword(getAuth(), email, password);
      await setDoc(doc(getDb(), "users", cred.user.uid), {
        name,
        email,
        role,
        createdAt: serverTimestamp(),
      });
      router.replace(role === "admin" ? "/admin" : "/order");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed";
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
            Join RestroAI
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">
            Create your account to start ordering or manage your restaurant with AI-powered insights.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-6">
            {[
              { label: "For Customers", desc: "Browse menus & voice order" },
              { label: "For Owners", desc: "AI analytics dashboard" },
              { label: "Smart Combos", desc: "AI-recommended bundles" },
              { label: "Voice AI", desc: "Order in any language" },
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
          className="w-full max-w-[400px]"
        >
          <div className="mb-8">
            <div className="lg:hidden mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-btn text-white text-sm font-bold">
              R
            </div>
            <h2 className="text-xl font-semibold text-text-primary">Create your account</h2>
            <p className="mt-1.5 text-sm text-text-muted">
              Get started with RestroAI
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-surface-border bg-white px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent placeholder:text-text-muted"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-surface-border bg-white px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent placeholder:text-text-muted"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-surface-border bg-white px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent placeholder:text-text-muted"
                placeholder="Min 6 characters"
                minLength={6}
              />
            </div>

            {/* Role selector */}
            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-2">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("customer")}
                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                    role === "customer"
                      ? "border-accent bg-accent-muted"
                      : "border-surface-border hover:border-text-muted"
                  }`}
                >
                  <p className="text-sm font-medium text-text-primary">Customer</p>
                  <p className="text-xs text-text-muted mt-0.5">Order food & drinks</p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                    role === "admin"
                      ? "border-accent bg-accent-muted"
                      : "border-surface-border hover:border-text-muted"
                  }`}
                >
                  <p className="text-sm font-medium text-text-primary">Restaurant Owner</p>
                  <p className="text-xs text-text-muted mt-0.5">Manage & analyze</p>
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-btn py-2.5 text-sm font-medium text-white transition-colors hover:bg-btn-hover disabled:opacity-50"
            >
              {submitting ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
