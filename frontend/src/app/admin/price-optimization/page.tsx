"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter,
  Target,
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
  Legend,
} from "recharts";
import { usePriceRecommendations, usePriceSummary } from "@/hooks/usePrice";
import { formatCurrency } from "@/utils/helpers";
import type { PriceRecommendation } from "@/types/order";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const animItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const ACTION_CONFIG: Record<string, { color: string; bg: string; text: string; icon: typeof ArrowUpRight; label: string }> = {
  increase: { color: "#10B981", bg: "bg-emerald-500/10", text: "text-emerald-500", icon: ArrowUpRight, label: "Increase" },
  decrease: { color: "#EF4444", bg: "bg-red-500/10", text: "text-red-500", icon: ArrowDownRight, label: "Decrease" },
  keep: { color: "#6B7280", bg: "bg-gray-500/10", text: "text-gray-500", icon: Minus, label: "Optimal" },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-red-500/10", text: "text-red-500", label: "High" },
  medium: { bg: "bg-amber-500/10", text: "text-amber-500", label: "Medium" },
  low: { bg: "bg-blue-500/10", text: "text-blue-500", label: "Low" },
};

const PIE_COLORS = ["#10B981", "#EF4444", "#6B7280"];

export default function PriceOptimizationPage() {
  const [filterAction, setFilterAction] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const { data: allRecs, isLoading: recsLoading } = usePriceRecommendations();
  const { data: summary, isLoading: summaryLoading } = usePriceSummary();

  const loading = recsLoading || summaryLoading;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-accent" />
      </div>
    );
  }

  // Client-side filtering (all data loaded once)
  let recs = allRecs ?? [];
  const categories = [...new Set(recs.map((r) => r.category))].sort();

  if (filterCategory) recs = recs.filter((r) => r.category === filterCategory);
  if (filterAction) recs = recs.filter((r) => r.action === filterAction);
  if (filterPriority) recs = recs.filter((r) => r.priority === filterPriority);

  // Pie chart data
  const pieData = [
    { name: "Increase", value: summary?.items_to_increase ?? 0 },
    { name: "Decrease", value: summary?.items_to_decrease ?? 0 },
    { name: "Optimal", value: summary?.items_optimal ?? 0 },
  ];

  // Top uplift items
  const topUplift = [...(allRecs ?? [])]
    .filter((r) => r.action !== "keep")
    .sort((a, b) => Math.abs(b.projected_monthly_uplift) - Math.abs(a.projected_monthly_uplift))
    .slice(0, 8)
    .map((r) => ({
      name: r.item_name.length > 18 ? r.item_name.substring(0, 15) + "…" : r.item_name,
      fullName: r.item_name,
      uplift: r.projected_monthly_uplift,
      action: r.action,
    }));

  return (
    <motion.div
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={animItem} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Price Optimization</h1>
          <p className="text-sm text-text-muted mt-1">
            AI-driven pricing recommendations to maximize revenue &amp; margin
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-text-muted" />
          <select
            className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-primary"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-primary"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option value="">All Actions</option>
            <option value="increase">Increase</option>
            <option value="decrease">Decrease</option>
            <option value="keep">Optimal</option>
          </select>
          <select
            className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-primary"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </motion.div>

      {/* Summary Cards */}
      {summary && (
        <motion.div variants={animItem} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            icon={<Target className="h-5 w-5" />}
            label="Total Items"
            value={String(summary.total_items)}
            color="text-accent"
          />
          <SummaryCard
            icon={<ArrowUpRight className="h-5 w-5" />}
            label="Need Increase"
            value={String(summary.items_to_increase)}
            color="text-emerald-500"
          />
          <SummaryCard
            icon={<ArrowDownRight className="h-5 w-5" />}
            label="Need Decrease"
            value={String(summary.items_to_decrease)}
            color="text-red-500"
          />
          <SummaryCard
            icon={<CheckCircle className="h-5 w-5" />}
            label="Optimal"
            value={String(summary.items_optimal)}
            color="text-gray-500"
          />
          <SummaryCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Monthly Uplift"
            value={formatCurrency(summary.total_monthly_uplift)}
            color={summary.total_monthly_uplift >= 0 ? "text-emerald-500" : "text-red-500"}
          />
        </motion.div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Action Distribution Pie */}
        <motion.div variants={animItem} className="rounded-xl border border-surface-border bg-surface-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-text-primary">Pricing Action Distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={55}
                strokeWidth={2}
                stroke="var(--color-surface-card)"
                label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface-card)",
                  border: "1px solid var(--color-surface-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Revenue Uplift Bar */}
        <motion.div variants={animItem} className="rounded-xl border border-surface-border bg-surface-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-text-primary flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            Top Projected Revenue Uplift
          </h2>
          {topUplift.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topUplift} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                  tickFormatter={(v: number) => `₹${v}`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface-card)",
                    border: "1px solid var(--color-surface-border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [formatCurrency(value), "Monthly Uplift"]}
                  labelFormatter={(label: string) => {
                    const match = topUplift.find((t) => t.name === label);
                    return match?.fullName ?? label;
                  }}
                />
                <Bar dataKey="uplift" radius={[0, 4, 4, 0]}>
                  {topUplift.map((entry, i) => (
                    <Cell key={i} fill={entry.uplift >= 0 ? "#10B981" : "#EF4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted py-12 text-center">All items are optimally priced!</p>
          )}
        </motion.div>
      </div>

      {/* Recommendations Table */}
      <motion.div variants={animItem} className="rounded-xl border border-surface-border bg-surface-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-text-primary">
          Price Recommendations ({recs.length} items)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border text-text-muted">
                <th className="pb-3 pr-3 font-medium">Item</th>
                <th className="pb-3 pr-3 font-medium">Category</th>
                <th className="pb-3 pr-3 font-medium text-right">Current ₹</th>
                <th className="pb-3 pr-3 font-medium text-right">Suggested ₹</th>
                <th className="pb-3 pr-3 font-medium text-right">Change</th>
                <th className="pb-3 pr-3 font-medium text-right">Margin %</th>
                <th className="pb-3 pr-3 font-medium text-center">Action</th>
                <th className="pb-3 pr-3 font-medium text-center">Priority</th>
                <th className="pb-3 font-medium text-right">Monthly Uplift</th>
              </tr>
            </thead>
            <tbody>
              {recs.slice(0, 30).map((r, i) => {
                const ac = ACTION_CONFIG[r.action] ?? ACTION_CONFIG.keep;
                const pc = PRIORITY_CONFIG[r.priority] ?? PRIORITY_CONFIG.low;
                const ActionIcon = ac.icon;
                return (
                  <tr
                    key={i}
                    className="border-b border-surface-border/50 hover:bg-surface-bg/50 transition-colors"
                  >
                    <td className="py-3 pr-3 font-medium text-text-primary">{r.item_name}</td>
                    <td className="py-3 pr-3 text-text-muted text-xs">{r.category}</td>
                    <td className="py-3 pr-3 text-right text-text-secondary">{formatCurrency(r.current_price)}</td>
                    <td className="py-3 pr-3 text-right font-medium text-text-primary">{formatCurrency(r.suggested_price)}</td>
                    <td className="py-3 pr-3 text-right">
                      <span className={`flex items-center justify-end gap-1 ${ac.text}`}>
                        <ActionIcon className="h-3 w-3" />
                        {r.price_change_pct > 0 ? "+" : ""}{r.price_change_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-right text-text-muted">{r.current_margin_pct.toFixed(0)}%</td>
                    <td className="py-3 pr-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${ac.bg} ${ac.text}`}>
                        <ActionIcon className="h-3 w-3" />
                        {ac.label}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${pc.bg} ${pc.text}`}>
                        {pc.label}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className={r.projected_monthly_uplift >= 0 ? "text-emerald-500" : "text-red-500"}>
                        {r.projected_monthly_uplift >= 0 ? "+" : ""}{formatCurrency(r.projected_monthly_uplift)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {recs.length > 30 && (
            <p className="mt-3 text-xs text-text-muted text-center">Showing 30 of {recs.length} items</p>
          )}
        </div>
      </motion.div>

      {/* High Priority Alert */}
      {(allRecs ?? []).filter((r) => r.priority === "high").length > 0 && (
        <motion.div variants={animItem} className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
          <h2 className="mb-3 text-sm font-semibold text-red-500 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            High Priority Actions
          </h2>
          <div className="space-y-2">
            {(allRecs ?? [])
              .filter((r) => r.priority === "high")
              .slice(0, 5)
              .map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-surface-card/60 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{r.item_name}</p>
                    <p className="text-xs text-text-muted">{r.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-text-primary">
                      {formatCurrency(r.current_price)} → {formatCurrency(r.suggested_price)}
                    </p>
                    <p className="text-xs text-emerald-500">
                      +{formatCurrency(Math.abs(r.projected_monthly_uplift))}/mo
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4">
      <div className="flex items-center gap-3">
        <div className={color}>{icon}</div>
        <div>
          <p className="text-xs text-text-muted">{label}</p>
          <p className="text-lg font-bold text-text-primary">{value}</p>
        </div>
      </div>
    </div>
  );
}
