"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  MapPin,
  Sparkles,
  ChevronRight,
  UtensilsCrossed,
  Bot,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useKPI } from "@/hooks/useKPI";
import { formatCurrency, formatNumber } from "@/utils/helpers";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const PIE_COLORS = ["#171717", "#D97706", "#737373", "#A3A3A3", "#E5E5E5"];

const QUICK_LINKS = [
  { href: "/admin/menu-manager", label: "Menu Manager", icon: UtensilsCrossed, desc: "BCG matrix & engineering" },
  { href: "/admin/price-optimization", label: "Price Optimization", icon: DollarSign, desc: "Margin-gap analysis" },
  { href: "/admin/combo-insights", label: "Combo Insights", icon: ShoppingCart, desc: "Apriori recommendations" },
  { href: "/admin/ai-assistant", label: "AI Assistant", icon: Bot, desc: "Gemini strategy chatbot" },
];

export default function DashboardPage() {
  const { data: kpis, isLoading, isError } = useKPI();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-accent" />
      </div>
    );
  }

  if (isError || !kpis) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-text-muted">Unable to load dashboard data.</p>
        <p className="text-xs text-text-muted">Check that the backend is running and try again.</p>
      </div>
    );
  }
  const kpiCards = [
    {
      label: "Total Revenue",
      value: formatCurrency(kpis.total_revenue),
      icon: DollarSign,
      change: "+12.5%",
      trend: "up" as const,
    },
    {
      label: "Avg Order Value",
      value: formatCurrency(kpis.avg_order_value),
      icon: TrendingUp,
      change: "+3.2%",
      trend: "up" as const,
    },
    {
      label: "Total Orders",
      value: formatNumber(kpis.total_orders),
      icon: ShoppingCart,
      change: "+8.1%",
      trend: "up" as const,
    },
    {
      label: "Top City",
      value: kpis.top_city,
      icon: MapPin,
      change: "#1",
      trend: "neutral" as const,
    },
  ];

  const cityRevenueData = Object.entries(kpis.revenue_by_city || {})
    .map(([city, revenue]) => ({ city, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 7);

  const topItems = (kpis.top_items || []).slice(0, 5);
  const totalQtySold = topItems.reduce((s, t) => s + t.total_qty, 0);

  const orderTypes = Object.entries(kpis.revenue_by_order_type || {}).sort(([, a], [, b]) => b - a);
  const topOrderType = orderTypes[0];

  return (
    <div>
      {/* Demo Banner */}
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Info className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Demo Mode</span> — Running on sample dataset. POS & delivery integrations coming soon.
        </p>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-accent" />
          <h1 className="text-xl font-semibold text-text-primary">AI Dashboard</h1>
        </div>
        <p className="text-sm text-text-muted">
          Real-time intelligence across {formatNumber(kpis.total_orders)} orders and {Object.keys(kpis.revenue_by_city || {}).length} cities
        </p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((kpi) => (
            <motion.div
              key={kpi.label}
              variants={item}
              className="group rounded-card border border-surface-border bg-surface-card p-5 hover:border-accent/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-text-muted">
                  {kpi.label}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-bg group-hover:bg-accent-muted transition-colors">
                  <kpi.icon className="h-4 w-4 text-text-muted group-hover:text-accent transition-colors" />
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-2xl font-semibold text-text-primary tracking-tight">
                  {kpi.value}
                </span>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${
                  kpi.trend === "up" ? "text-emerald-600" : "text-text-muted"
                }`}>
                  {kpi.trend === "up" && <ArrowUpRight className="h-3 w-3" />}
                  {kpi.change}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Revenue by City Chart */}
          <motion.div
            variants={item}
            className="col-span-1 lg:col-span-2 rounded-card border border-surface-border bg-surface-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-medium text-text-muted">Revenue by City</h3>
              <span className="text-[11px] text-text-muted bg-surface-bg rounded-full px-2.5 py-0.5">
                Top {cityRevenueData.length}
              </span>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cityRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
                  <XAxis
                    dataKey="city"
                    tick={{ fontSize: 12, fill: "#8A8A8A" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12, fill: "#8A8A8A" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #E5E5E5",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <Bar dataKey="revenue" fill="#1F1F1F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Top Selling Items */}
          <motion.div
            variants={item}
            className="rounded-card border border-surface-border bg-surface-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-medium text-text-muted">Top Selling Items</h3>
              <span className="text-[11px] text-text-muted bg-surface-bg rounded-full px-2.5 py-0.5">
                {totalQtySold} sold
              </span>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topItems}
                    dataKey="total_qty"
                    nameKey="item_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {topItems.map((_: unknown, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #E5E5E5",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1.5">
              {topItems.map((si: { item_name: string; total_qty: number }, i: number) => (
                <div key={si.item_name} className="flex items-center gap-2 text-xs">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="flex-1 truncate text-text-secondary">{si.item_name}</span>
                  <span className="font-medium text-text-primary">{si.total_qty}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Revenue by Order Type + Quick Actions */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Revenue by Order Type */}
          <motion.div
            variants={item}
            className="col-span-1 lg:col-span-2 rounded-card border border-surface-border bg-surface-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-medium text-text-muted">Revenue by Order Type</h3>
              {topOrderType && (
                <span className="text-[11px] font-medium text-accent bg-accent-muted rounded-full px-2.5 py-0.5 capitalize">
                  Top: {topOrderType[0]}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="pb-3 text-left text-xs font-medium text-text-muted">Order Type</th>
                    <th className="pb-3 text-right text-xs font-medium text-text-muted">Revenue</th>
                    <th className="pb-3 text-right text-xs font-medium text-text-muted">Share</th>
                    <th className="pb-3 text-right text-xs font-medium text-text-muted">Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {orderTypes.map(([type, rev]) => {
                    const pct = kpis.total_revenue > 0 ? (rev / kpis.total_revenue) * 100 : 0;
                    return (
                      <tr key={type} className="border-b border-surface-border/50 last:border-0">
                        <td className="py-3 text-sm text-text-primary capitalize font-medium">{type}</td>
                        <td className="py-3 text-sm text-text-primary text-right">
                          {formatCurrency(rev)}
                        </td>
                        <td className="py-3 text-right">
                          <span className="inline-block rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium text-accent">
                            {pct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 pl-4 w-32">
                          <div className="h-2 rounded-full bg-surface-bg overflow-hidden">
                            <div
                              className="h-full rounded-full bg-text-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            variants={item}
            className="rounded-card border border-surface-border bg-surface-card p-5"
          >
            <h3 className="text-[13px] font-medium text-text-muted mb-4">AI Modules</h3>
            <div className="space-y-2">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 rounded-lg border border-surface-border p-3 hover:border-accent/30 hover:bg-accent-muted/30 transition-colors group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-bg group-hover:bg-accent-muted transition-colors">
                    <link.icon className="h-4 w-4 text-text-muted group-hover:text-accent transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{link.label}</p>
                    <p className="text-[11px] text-text-muted truncate">{link.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-accent shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
