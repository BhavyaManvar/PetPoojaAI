"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Brain,
  BarChart3,
  Mic,
  TrendingUp,
  ShoppingCart,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Target,
  Shield,
  Star,
  Check,
  Globe,
  LineChart,
} from "lucide-react";

// Reusable scroll-reveal wrapper
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

const FEATURES = [
  { icon: Brain, title: "AI Revenue Intelligence", desc: "Get actionable insights to grow your restaurant revenue with data-driven BCG matrix analysis." },
  { icon: BarChart3, title: "Menu Engineering", desc: "Classify every menu item into Stars, Puzzles, Plowhorses, and Dogs — automatically." },
  { icon: ShoppingCart, title: "Smart Combo Generator", desc: "Discover high-lift item pairings using Apriori market basket analysis from real order data." },
  { icon: Mic, title: "Voice Ordering AI", desc: "Accept orders in English, Hindi, or Hinglish with multilingual natural language understanding." },
  { icon: TrendingUp, title: "Price Optimization", desc: "AI-recommended pricing changes with estimated monthly revenue uplift projections." },
  { icon: Sparkles, title: "Strategy Chatbot", desc: "Ask your AI copilot anything — menu performance, combos, growth strategies, and pricing health." },
];

const STEPS = [
  { step: "01", title: "Connect Your Data", desc: "Upload your PoS data or connect directly. We support all major formats." },
  { step: "02", title: "AI Analyzes Everything", desc: "Our engine classifies menu items, finds combos, and identifies pricing opportunities." },
  { step: "03", title: "View Your Dashboard", desc: "Get a comprehensive overview of revenue, margins, and growth potential." },
  { step: "04", title: "Act on Insights", desc: "Implement AI-suggested combos, price changes, and promotions to boost revenue." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── NAVBAR ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 z-50 w-full">
        <div className="glass-dark mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black text-sm font-bold">
              R
            </div>
            <span className="text-[15px] font-semibold tracking-tight">RestroAI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-white/60 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-white/60 hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="text-sm text-white/60 hover:text-white transition-colors">Pricing</a>
            <a href="#testimonials" className="text-sm text-white/60 hover:text-white transition-colors">Testimonials</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors">
              Admin Sign In
            </Link>
            <Link
              href="http://localhost:5173"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 transition-colors"
            >
              Order Food
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ───────────────────────────────────────────── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        {/* WebGL background — animated gradient */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-neutral-950 to-black" />
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: "radial-gradient(circle at 30% 40%, rgba(217, 119, 6, 0.15) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.04) 0%, transparent 50%)"
          }} />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px"
          }} />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              AI-Powered Restaurant Intelligence
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl"
          >
            AI Copilot for{" "}
            <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">
              Restaurant Revenue
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/50"
          >
            Turn your restaurant data into actionable insights and automate customer ordering with AI.
            Menu engineering, smart combos, voice ordering — all in one platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Link
              href="http://localhost:5173"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition-all hover:bg-white/90 hover:shadow-lg hover:shadow-white/10"
            >
              Order Now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/order"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-7 py-3.5 text-sm font-medium text-white/80 transition-all hover:border-white/30 hover:text-white"
            >
              Try Live Demo
              <ChevronRight className="h-4 w-4" />
            </Link>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 inline-flex items-center gap-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-8 py-4"
          >
            {[
              { value: "200+", label: "Menu Items" },
              { value: "1,000+", label: "Orders Analyzed" },
              { value: "3", label: "Languages" },
              { value: "18%", label: "Avg Revenue Uplift" },
            ].map((stat, i) => (
              <div key={stat.label} className={`text-center ${i > 0 ? "border-l border-white/[0.08] pl-8" : ""}`}>
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-20 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-2 shadow-2xl shadow-black/50"
          >
            <div className="rounded-xl bg-neutral-900 p-6">
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Total Revenue", value: "₹12,48,500", change: "+12.3%" },
                  { label: "Avg Order Value", value: "₹385", change: "+8.1%" },
                  { label: "Total Orders", value: "3,242", change: "+15.7%" },
                  { label: "AI Insights", value: "24", change: "Active" },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-4">
                    <p className="text-xs text-white/40">{kpi.label}</p>
                    <p className="mt-1 text-xl font-semibold text-white">{kpi.value}</p>
                    <p className="mt-1 text-xs text-emerald-400">{kpi.change}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 rounded-lg bg-white/[0.04] border border-white/[0.06] p-4 h-48">
                  <p className="text-xs text-white/40 mb-3">Revenue Trend</p>
                  <div className="flex items-end gap-2 h-32">
                    {[40, 55, 45, 70, 60, 85, 75, 90, 80, 95, 88, 100].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-amber-500/40 to-amber-500/80" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-4 h-48">
                  <p className="text-xs text-white/40 mb-3">Menu Matrix</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs text-amber-400">12 Stars</span>
                    <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs text-violet-400">8 Puzzles</span>
                    <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-400">15 Plowhorses</span>
                    <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-400">5 Dogs</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES SECTION ───────────────────────────────────────── */}
      <section id="features" className="py-32 px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="text-center mb-20">
              <p className="text-sm font-medium text-amber-500 mb-3">Features</p>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Everything you need to<br />
                <span className="text-white/40">maximize restaurant revenue</span>
              </h2>
            </div>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 0.08}>
                <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06] text-white/80 transition-colors group-hover:bg-amber-500/20 group-hover:text-amber-400">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-white/40">{feature.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────── */}
      <section id="how-it-works" className="py-32 px-6 border-t border-white/[0.06]">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <div className="text-center mb-20">
              <p className="text-sm font-medium text-amber-500 mb-3">How it Works</p>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                From data to decisions<br />
                <span className="text-white/40">in four steps</span>
              </h2>
            </div>
          </Reveal>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <Reveal key={step.step} delay={i * 0.1}>
                <div className="relative">
                  <div className="text-6xl font-extrabold text-white/[0.04] mb-4">{step.step}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-white/40">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO PREVIEW ───────────────────────────────────────────── */}
      <section id="demo" className="py-32 px-6 border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-sm font-medium text-amber-500 mb-3">Product Demo</p>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                See it in action
              </h2>
            </div>
          </Reveal>
          <div className="grid gap-8 lg:grid-cols-3">
            <Reveal delay={0.05}>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 h-full">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
                <p className="text-sm text-white/40 mb-4">Real-time KPIs, revenue trends, and menu performance at a glance.</p>
                <div className="rounded-lg bg-white/[0.04] p-4 space-y-3">
                  <div className="flex justify-between text-xs"><span className="text-white/50">Revenue Today</span><span className="text-emerald-400">₹42,300</span></div>
                  <div className="flex justify-between text-xs"><span className="text-white/50">Orders</span><span className="text-white">128</span></div>
                  <div className="flex justify-between text-xs"><span className="text-white/50">Avg Order</span><span className="text-white">₹330</span></div>
                  <div className="h-px bg-white/[0.06]" />
                  <div className="flex justify-between text-xs"><span className="text-white/50">Top Item</span><span className="text-amber-400">Paneer Tikka</span></div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 h-full">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
                  <Mic className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Voice Ordering</h3>
                <p className="text-sm text-white/40 mb-4">Natural language ordering in English, Hindi, and Hinglish.</p>
                <div className="rounded-lg bg-white/[0.04] p-4 space-y-3">
                  <div className="rounded-lg bg-white/[0.06] px-3 py-2 text-xs text-white/60 italic">"Ek paneer pizza aur do coke dena"</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs"><span className="text-white">Paneer Pizza</span><span className="text-white/50">×1</span></div>
                    <div className="flex justify-between text-xs"><span className="text-white">Coke</span><span className="text-white/50">×2</span></div>
                  </div>
                  <div className="text-xs text-emerald-400">✓ Order confirmed</div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 h-full">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold mb-2">AI Strategy Assistant</h3>
                <p className="text-sm text-white/40 mb-4">Chat with your AI copilot about menu strategy and pricing.</p>
                <div className="rounded-lg bg-white/[0.04] p-4 space-y-3">
                  <div className="rounded-lg bg-white/[0.06] px-3 py-2 text-xs text-white/60">"How can I increase revenue?"</div>
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-200">
                    Promote Garlic Bread — high margin (₹85) but low sales. Bundle with pasta for a combo deal.
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ────────────────────────────────────────── */}
      <section id="pricing" className="py-32 px-6 border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="text-center mb-20">
              <p className="text-sm font-medium text-amber-500 mb-3">Pricing</p>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Simple, transparent pricing<br />
                <span className="text-white/40">for every restaurant</span>
              </h2>
              <p className="mt-4 text-base text-white/40 max-w-xl mx-auto">
                Start free for 14 days. No credit card required. Scale as your business grows.
              </p>
            </div>
          </Reveal>
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                name: "Starter", price: "₹2,999", period: "/mo",
                desc: "For small restaurants getting started with AI analytics.",
                features: ["Up to 500 orders/month", "Menu engineering (BCG matrix)", "Basic revenue dashboard", "Email support"],
                cta: "Start Free Trial", highlighted: false,
              },
              {
                name: "Professional", price: "₹7,999", period: "/mo",
                desc: "For growing restaurants that want the full AI suite.",
                features: ["Unlimited orders", "Menu engineering + combo discovery", "Price optimization engine", "Voice ordering (3 languages)", "AI strategy chatbot", "Priority support"],
                cta: "Start Free Trial", highlighted: true,
              },
              {
                name: "Enterprise", price: "Custom", period: "",
                desc: "For chains and franchises with multi-outlet needs.",
                features: ["Multi-outlet management", "Dedicated account manager", "Custom AI model training", "API access & integrations", "SSO & advanced security", "On-premise deployment"],
                cta: "Contact Sales", highlighted: false,
              },
            ].map((plan, i) => (
              <Reveal key={plan.name} delay={i * 0.1}>
                <div className={`relative rounded-2xl border p-8 h-full flex flex-col ${
                  plan.highlighted
                    ? "border-amber-500/40 bg-gradient-to-b from-amber-500/[0.08] to-transparent"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}>
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-4 py-1 text-xs font-semibold text-black">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                    <p className="text-sm text-white/40 mt-1">{plan.desc}</p>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-sm text-white/40">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-white/60">
                        <Check className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login"
                    className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                      plan.highlighted
                        ? "bg-white text-black hover:bg-white/90"
                        : "border border-white/[0.12] text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS SECTION ───────────────────────────────────── */}
      <section id="testimonials" className="py-32 px-6 border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="text-center mb-20">
              <p className="text-sm font-medium text-amber-500 mb-3">Testimonials</p>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Trusted by restaurant owners<br />
                <span className="text-white/40">across India</span>
              </h2>
            </div>
          </Reveal>
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              { quote: "RestroAI helped us identify 14 high-margin items we weren't promoting. Revenue is up 18% in just two months.", author: "Priya Sharma", role: "Owner, Spice Kitchen", city: "Mumbai" },
              { quote: "The voice ordering in Hindi is a game-changer for our staff. Order accuracy went from 85% to 98%.", author: "Rajesh Patel", role: "Manager, Tandoori Nights", city: "Ahmedabad" },
              { quote: "We removed 12 Dog items and created 8 new combos based on AI suggestions. Our average order value increased by ₹65.", author: "Ananya Desai", role: "Owner, The Urban Plate", city: "Bangalore" },
            ].map((t, i) => (
              <Reveal key={t.author} delay={i * 0.1}>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 h-full flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-white/60 flex-1">&quot;{t.quote}&quot;</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-sm font-semibold text-white">
                      {t.author.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{t.author}</p>
                      <p className="text-xs text-white/40">{t.role} · {t.city}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT SECTION ──────────────────────────────────────────── */}
      <section id="about" className="py-32 px-6 border-t border-white/[0.06]">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <p className="text-sm font-medium text-amber-500 mb-3">About</p>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-8">
              Built for Indian restaurants<br />
              <span className="text-white/40">who want to grow smarter</span>
            </h2>
            <p className="text-lg leading-relaxed text-white/50 max-w-2xl mx-auto">
              RestroAI combines menu engineering, market basket analysis, and multilingual voice AI
              into a single platform — helping restaurants make data-driven decisions to increase
              revenue, optimize pricing, and improve operations.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-8">
              {[
                { icon: Target, label: "Precision", desc: "BCG matrix for every item" },
                { icon: Globe, label: "Multilingual", desc: "English, Hindi & Hinglish" },
                { icon: LineChart, label: "Data-Driven", desc: "Insights from real PoS data" },
                { icon: Shield, label: "Secure", desc: "Enterprise-grade auth" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06]">
                    <item.icon className="h-5 w-5 text-white/60" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1">{item.label}</h3>
                  <p className="text-xs text-white/40">{item.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA SECTION ────────────────────────────────────────────── */}
      <section className="py-32 px-6 border-t border-white/[0.06]">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">
              Ready to boost your<br />restaurant revenue?
            </h2>
            <p className="text-lg text-white/50 mb-10">
              Join forward-thinking restaurant owners using AI to make smarter decisions.
              Start your 14-day free trial today.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold text-black transition-all hover:bg-white/90 hover:shadow-lg hover:shadow-white/10"
              >
                Admin Sign In
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/order"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-8 py-4 text-sm font-medium text-white/80 transition-all hover:border-white/30 hover:text-white"
              >
                Try Live Demo
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-16 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 mb-12">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-black text-xs font-bold">R</div>
                <span className="text-sm font-semibold">RestroAI</span>
              </div>
              <p className="text-xs text-white/30 leading-relaxed">
                AI-powered revenue intelligence for modern restaurants.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-white/60 mb-3 uppercase tracking-wider">Product</p>
              <ul className="space-y-2">
                <li><a href="#features" className="text-xs text-white/30 hover:text-white/60 transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-xs text-white/30 hover:text-white/60 transition-colors">Pricing</a></li>
                <li><Link href="/order" className="text-xs text-white/30 hover:text-white/60 transition-colors">Live Demo</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-white/60 mb-3 uppercase tracking-wider">Platform</p>
              <ul className="space-y-2">
                <li><Link href="/admin" className="text-xs text-white/30 hover:text-white/60 transition-colors">Admin Dashboard</Link></li>
                <li><Link href="/order" className="text-xs text-white/30 hover:text-white/60 transition-colors">Customer Ordering</Link></li>
                <li><Link href="/order/voice" className="text-xs text-white/30 hover:text-white/60 transition-colors">Voice AI</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-white/60 mb-3 uppercase tracking-wider">Company</p>
              <ul className="space-y-2">
                <li><a href="#about" className="text-xs text-white/30 hover:text-white/60 transition-colors">About</a></li>
                <li><a href="#testimonials" className="text-xs text-white/30 hover:text-white/60 transition-colors">Testimonials</a></li>
                <li><Link href="/login" className="text-xs text-white/30 hover:text-white/60 transition-colors">Sign In</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/[0.06] pt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-white/30">
              &copy; {new Date().getFullYear()} RestroAI. AI-Powered Restaurant Intelligence Platform.
            </p>
            <div className="flex gap-6">
              <span className="text-xs text-white/20">Privacy</span>
              <span className="text-xs text-white/20">Terms</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
