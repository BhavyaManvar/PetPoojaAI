"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  Zap,
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
import { fetchKPIs } from "@/services/api";
import type { KPIData } from "@/types/order";
import { formatCurrency, formatNumber } from "@/utils/helpers";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const PIE_COLORS = ["#C47A2C", "#1F1F1F", "#8A8A8A", "#D4943F", "#E5E5E5"];

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKPIs()
      .then(setKpis)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-accent" />
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-text-muted">No data available yet.</p>
        <p className="text-xs text-text-muted">Add menu items and orders to see analytics.</p>
      </div>
    );
  }
  const kpiCards = [
    {
      label: "Total Revenue",
      value: formatCurrency(kpis.total_revenue),
      icon: DollarSign,
      change: "+12.5%",
    },
    {
      label: "Avg Order Value",
      value: formatCurrency(kpis.avg_order_value),
      icon: TrendingUp,
      change: "+3.2%",
    },
    {
      label: "Total Orders",
      value: formatNumber(kpis.total_orders),
      icon: ShoppingCart,
      change: "+8.1%",
    },
    {
      label: "Top City",
      value: kpis.top_city,
      icon: Zap,
      change: "#1",
    },
  ];

  const cityRevenueData = Object.entries(kpis.revenue_by_city || {})
    .map(([city, revenue]) => ({ city, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 7);

  const topItems = (kpis.top_items || []).slice(0, 5);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-muted">
          Overview of your restaurant performance
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
              className="rounded-card border border-surface-border bg-surface-card p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-text-muted">
                  {kpi.label}
                </span>
                <kpi.icon className="h-4 w-4 text-text-muted" />
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-2xl font-semibold text-text-primary tracking-tight">
                  {kpi.value}
                </span>
                <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                  <ArrowUpRight className="h-3 w-3" />
                  {kpi.change}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">          {/* Revenue by City Chart */}
          <motion.div
            variants={item}
            className="col-span-2 rounded-card border border-surface-border bg-surface-card p-5"
          >
            <h3 className="text-[13px] font-medium text-text-muted mb-4">
              Revenue by City
            </h3>
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
            <h3 className="text-[13px] font-medium text-text-muted mb-4">
              Top Selling Items
            </h3>
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
            <div className="mt-2 space-y-2">
              {topItems.map((si: { item_name: string; total_qty: number }, i: number) => (
                <div key={si.item_name} className="flex items-center gap-2 text-[13px]">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="flex-1 truncate text-text-secondary">{si.item_name}</span>
                  <span className="font-medium text-text-primary">{si.total_qty}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>        {/* Revenue by Order Type */}
        <motion.div
          variants={item}
          className="rounded-card border border-surface-border bg-surface-card p-5"
        >
          <h3 className="text-[13px] font-medium text-text-muted mb-4">
            Revenue by Order Type
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="pb-3 text-[12px] font-medium text-text-muted uppercase tracking-wider">
                    Order Type
                  </th>
                  <th className="pb-3 text-[12px] font-medium text-text-muted uppercase tracking-wider text-right">
                    Revenue
                  </th>
                  <th className="pb-3 text-[12px] font-medium text-text-muted uppercase tracking-wider text-right">
                    Share
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {Object.entries(kpis.revenue_by_order_type || {})
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, rev]) => (
                    <tr key={type}>
                      <td className="py-3 text-sm text-text-primary capitalize">{type}</td>
                      <td className="py-3 text-sm text-text-primary text-right font-medium">
                        {formatCurrency(rev)}
                      </td>
                      <td className="py-3 text-right">
                        <span className="inline-block rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium text-accent">
                          {kpis.total_revenue > 0
                            ? ((rev / kpis.total_revenue) * 100).toFixed(1)
                            : "0"}%
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
