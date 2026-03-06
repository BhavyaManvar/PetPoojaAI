"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart3,
  Brain,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  ArrowRight,
  Shield,
  Sparkles,
  Bot,
} from "lucide-react";

const MODULES = [
  { icon: BarChart3, title: "Menu Engineering", desc: "BCG matrix analysis — stars, puzzles, plowhorses & dogs" },
  { icon: DollarSign, title: "Price Optimization", desc: "Margin-gap engine with data-backed recommendations" },
  { icon: ShoppingCart, title: "Combo Engine", desc: "Apriori-based combo discovery & upsell suggestions" },
  { icon: TrendingUp, title: "Revenue Insights", desc: "City-wise, category-wise & trend analytics" },
  { icon: Bot, title: "AI Strategy Assistant", desc: "Gemini-powered chatbot with voice — ask anything" },
  { icon: Brain, title: "KPI Dashboard", desc: "Real-time metrics across orders, revenue & performance" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function AdminLandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Nav */}
      <nav className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white text-sm font-bold">
              R
            </div>
            <span className="text-sm font-semibold text-neutral-900">Revenue Copilot</span>
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="http://localhost:3000"
              className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Customer Site &rarr;
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 tracking-tight sm:text-5xl">
            Admin Dashboard
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-500">
            AI-powered restaurant intelligence. Manage menus, optimize pricing,
            discover combos, and grow revenue — all from one place.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-neutral-900/20 hover:bg-neutral-800 transition-colors"
            >
              Open Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="http://localhost:3000"
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 hover:border-neutral-300 transition-colors"
            >
              View Customer Site
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Modules grid */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {MODULES.map((mod) => (
            <motion.div
              key={mod.title}
              variants={item}
              className="group rounded-2xl border border-neutral-200 bg-white p-6 hover:border-neutral-300 hover:shadow-md transition-all"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 group-hover:bg-neutral-900 transition-colors">
                <mod.icon className="h-5 w-5 text-neutral-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-900">{mod.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500">{mod.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Demo badge */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              <span className="font-semibold">Demo Mode</span> — Running on sample dataset &middot; POS integrations coming soon
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-6">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <p className="text-xs text-neutral-400">&copy; 2026 PetPooja AI Revenue Copilot</p>
          <p className="text-xs text-neutral-400">Admin Portal</p>
        </div>
      </footer>
    </div>
  );
}
