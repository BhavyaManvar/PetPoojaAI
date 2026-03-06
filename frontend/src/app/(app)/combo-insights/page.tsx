"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  TrendingUp,
  Zap,
  Package,
  ArrowRight,
  Filter,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from "recharts";
import { useCombos, useUpsellBatch } from "@/hooks/useCombos";
import { useQuery } from "@tanstack/react-query";
import { fetchBasketStats, fetchMenuInsights } from "@/services/api";
import { formatCurrency } from "@/utils/helpers";
import type { Combo, BasketStats } from "@/types/order";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const STRATEGY_COLORS: Record<string, string> = {
  cross_category_combo: "#C47A2C",
  same_category_combo: "#3B82F6",
  hidden_star_promotion: "#8B5CF6",
  popular_addon: "#10B981",
};

const STRATEGY_LABELS: Record<string, string> = {
  cross_category_combo: "Cross-Category",
  same_category_combo: "Same Category",
  hidden_star_promotion: "Hidden Star",
  popular_addon: "Popular Add-on",
};

export default function ComboInsightsPage() {
  const [category, setCategory] = useState<string>("");
  const { data: combosData, isLoading: combosLoading } = useCombos(category || undefined);
  const { data: basketStats, isLoading: statsLoading } = useQuery({
    queryKey: ["basket-stats"],
    queryFn: fetchBasketStats,
  });
  const { data: menuItems } = useQuery({
    queryKey: ["menu-insights-for-combos"],
    queryFn: fetchMenuInsights,
  });

  // Get top 5 item IDs for batch upsell demo
  const topItemIds = menuItems?.slice(0, 8).map((m) => m.item_id) ?? [];
  const { data: upsellResults } = useUpsellBatch(topItemIds);

  // Extract unique categories from combos
  const categories = menuItems
    ? [...new Set(menuItems.map((m) => m.category))].sort()
    : [];

  const combos = combosData?.combos ?? [];
  const loading = combosLoading || statsLoading;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-accent" />
      </div>
    );
  }

  // Prepare chart data — top 10 combos by lift
  const chartCombos = [...combos]
    .sort((a, b) => b.lift - a.lift)
    .slice(0, 10)
    .map((c) => ({
      name: c.combo.length > 25 ? c.combo.substring(0, 22) + "…" : c.combo,
      fullName: c.combo,
      lift: Number(c.lift.toFixed(2)),
      confidence: Number((c.confidence * 100).toFixed(1)),
      support: Number((c.support * 100).toFixed(2)),
    }));

  // Scatter data for support vs confidence
  const scatterData = combos.map((c) => ({
    x: c.support * 100,
    y: c.confidence * 100,
    z: c.lift,
    name: c.combo,
  }));

  return (
    <motion.div
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Combo & Upsell Insights
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Market basket analysis — discover which items sell together
          </p>
        </div>
        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-text-muted" />
            <select
              className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-primary"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </motion.div>

      {/* Basket Stats Cards */}
      {basketStats && (
        <motion.div variants={item} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<ShoppingCart className="h-5 w-5" />}
            label="Total Baskets"
            value={basketStats.total_baskets.toLocaleString()}
            color="text-accent"
          />
          <StatCard
            icon={<Package className="h-5 w-5" />}
            label="Avg Basket Size"
            value={basketStats.avg_basket_size.toFixed(1)}
            sub="items per order"
            color="text-blue-500"
          />
          <StatCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Max Basket Size"
            value={String(basketStats.max_basket_size)}
            sub="items"
            color="text-purple-500"
          />
          <StatCard
            icon={<Zap className="h-5 w-5" />}
            label="Combos Found"
            value={String(combos.length)}
            sub="association rules"
            color="text-emerald-500"
          />
        </motion.div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Combos by Lift */}
        <motion.div
          variants={item}
          className="rounded-xl border border-surface-border bg-surface-card p-5"
        >
          <h2 className="mb-4 text-sm font-semibold text-text-primary flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            Top Combos by Lift
          </h2>
          {chartCombos.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartCombos} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={140}
                  tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface-card)",
                    border: "1px solid var(--color-surface-border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "lift") return [value.toFixed(2), "Lift"];
                    if (name === "confidence") return [`${value}%`, "Confidence"];
                    return [value, name];
                  }}
                />
                <Bar dataKey="lift" fill="#C47A2C" radius={[0, 4, 4, 0]} name="lift" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted py-12 text-center">
              No combos found for this category.
            </p>
          )}
        </motion.div>

        {/* Support vs Confidence Scatter */}
        <motion.div
          variants={item}
          className="rounded-xl border border-surface-border bg-surface-card p-5"
        >
          <h2 className="mb-4 text-sm font-semibold text-text-primary flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            Support vs Confidence
          </h2>
          {scatterData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ bottom: 10, left: 5, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
                <XAxis
                  dataKey="x"
                  type="number"
                  name="Support %"
                  tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                  label={{ value: "Support %", position: "bottom", fontSize: 11, fill: "var(--color-text-muted)" }}
                />
                <YAxis
                  dataKey="y"
                  type="number"
                  name="Confidence %"
                  tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                  label={{ value: "Confidence %", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--color-text-muted)" }}
                />
                <ZAxis dataKey="z" range={[40, 400]} name="Lift" />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface-card)",
                    border: "1px solid var(--color-surface-border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "Support %") return [`${value.toFixed(2)}%`, name];
                    if (name === "Confidence %") return [`${value.toFixed(1)}%`, name];
                    if (name === "Lift") return [value.toFixed(2), name];
                    return [value, name];
                  }}
                />
                <Scatter data={scatterData} fill="#3B82F6" fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted py-12 text-center">
              Not enough data for scatter plot.
            </p>
          )}
        </motion.div>
      </div>

      {/* Combo Rules Table */}
      <motion.div
        variants={item}
        className="rounded-xl border border-surface-border bg-surface-card p-5"
      >
        <h2 className="mb-4 text-sm font-semibold text-text-primary">
          Association Rules ({combos.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border text-text-muted">
                <th className="pb-3 pr-4 font-medium">Antecedent</th>
                <th className="pb-3 pr-4 font-medium" />
                <th className="pb-3 pr-4 font-medium">Consequent</th>
                <th className="pb-3 pr-4 font-medium text-right">Support</th>
                <th className="pb-3 pr-4 font-medium text-right">Confidence</th>
                <th className="pb-3 font-medium text-right">Lift</th>
              </tr>
            </thead>
            <tbody>
              {combos.slice(0, 20).map((c, i) => (
                <tr
                  key={i}
                  className="border-b border-surface-border/50 hover:bg-surface-bg/50 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-text-primary">
                    {c.antecedent}
                  </td>
                  <td className="py-3 pr-4">
                    <ArrowRight className="h-4 w-4 text-text-muted" />
                  </td>
                  <td className="py-3 pr-4 text-text-secondary">{c.consequent}</td>
                  <td className="py-3 pr-4 text-right text-text-muted">
                    {(c.support * 100).toFixed(2)}%
                  </td>
                  <td className="py-3 pr-4 text-right text-text-secondary">
                    {(c.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.lift >= 2
                          ? "bg-emerald-500/10 text-emerald-500"
                          : c.lift >= 1.2
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-surface-bg text-text-muted"
                      }`}
                    >
                      {c.lift.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {combos.length > 20 && (
            <p className="mt-3 text-xs text-text-muted text-center">
              Showing top 20 of {combos.length} rules
            </p>
          )}
        </div>
      </motion.div>

      {/* Upsell Recommendations */}
      {upsellResults && upsellResults.length > 0 && (
        <motion.div
          variants={item}
          className="rounded-xl border border-surface-border bg-surface-card p-5"
        >
          <h2 className="mb-4 text-sm font-semibold text-text-primary flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-500" />
            AI Upsell Recommendations
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {upsellResults
              .filter((u) => u.recommended_addon)
              .map((u, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-surface-border/50 bg-surface-bg/30 p-4"
                >
                  <p className="text-xs text-text-muted mb-1">
                    When ordering
                  </p>
                  <p className="text-sm font-semibold text-text-primary mb-2">
                    {u.item}
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRight className="h-3 w-3 text-accent" />
                    <p className="text-sm text-accent font-medium">
                      {u.recommended_addon}
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor:
                        (STRATEGY_COLORS[u.strategy ?? ""] ?? "#6B7280") + "15",
                      color: STRATEGY_COLORS[u.strategy ?? ""] ?? "#6B7280",
                    }}
                  >
                    {STRATEGY_LABELS[u.strategy ?? ""] ?? u.strategy}
                  </span>
                </div>
              ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── Small helper component ──────────────────────────────────────────── */
function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4">
      <div className="flex items-center gap-3">
        <div className={`${color}`}>{icon}</div>
        <div>
          <p className="text-xs text-text-muted">{label}</p>
          <p className="text-xl font-bold text-text-primary">{value}</p>
          {sub && <p className="text-[11px] text-text-muted">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
