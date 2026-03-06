"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

/**
 * Owner/Restaurant signup is disabled.
 * Admin and staff accounts are provisioned server-side.
 */
export default function SignupPage() {
  return (
    <div className="flex min-h-screen bg-surface-bg">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-btn p-12">
        <div className="max-w-md">
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white text-xl font-bold">
            R
          </div>
          <h1 className="text-3xl font-semibold text-white leading-tight">
            RestroAI Admin
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">
            Enterprise-grade revenue intelligence and AI-powered voice ordering
            for modern restaurants.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-[420px] text-center"
        >
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
            <Shield className="h-7 w-7 text-amber-700" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Restaurant owner signup is disabled
          </h2>
          <p className="text-sm text-text-muted leading-relaxed mb-6">
            Owner and staff accounts are created by our team.<br />
            To get an account, contact{" "}
            <strong className="text-text-primary">owner@yourdomain.com</strong>.
          </p>
          <Link
            href="/login"
            className="inline-flex rounded-lg bg-btn px-6 py-2.5 text-sm font-medium text-white hover:bg-btn-hover transition-colors"
          >
            Return to Sign In
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
