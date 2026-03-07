"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle, Star as StarIcon, Lightbulb } from "lucide-react";
import {
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Cell,
} from "recharts";
import { fetchMenuInsights, fetchTopCombos } from "@/services/api";
import type { MenuItem } from "@/types/menu";
import { formatCurrency } from "@/utils/helpers";

type MenuClass = "Star" | "Plowhorse" | "Puzzle" | "Dog";

interface AnalyticsItem extends MenuItem {
  classification: MenuClass;
  popularity_score: number;
}

/** Map backend menu_class ("Plow Horse") → UI MenuClass ("Plowhorse") */
function normalizeClass(mc: string): MenuClass {
  const map: Record<string, MenuClass> = {
    Star: "Star",
    Puzzle: "Puzzle",
    Dog: "Dog",
    "Plow Horse": "Plowhorse",
    Plowhorse: "Plowhorse",
  };
  return map[mc] ?? "Dog";
}

interface UpsellDisplay {
  base_item: string;
  suggested_item: string;
  confidence_score: number;
}

const CLASS_COLORS: Record<MenuClass, string> = {
  Star: "#C47A2C",
  Plowhorse: "#3B82F6",
  Puzzle: "#8B5CF6",
  Dog: "#EF4444",
};

const CLASS_LABELS: Record<MenuClass, { label: string; desc: string }> = {
  Star: { label: "Stars", desc: "High profit, high popularity — your winners" },
  Plowhorse: { label: "Plowhorses", desc: "Low profit, high popularity — optimize pricing" },
  Puzzle: { label: "Puzzles", desc: "High profit, low popularity — increase exposure" },
  Dog: { label: "Dogs", desc: "Low profit, low popularity — consider removing" },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const animItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function RevenueInsightsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsItem[]>([]);
  const [upsellRules, setUpsellRules] = useState<UpsellDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeClass, setActiveClass] = useState<MenuClass | "All">("All");

  useEffect(() => {
    (async () => {
      try {
        const [items, combosRes] = await Promise.all([
          fetchMenuInsights(),
          fetchTopCombos(),
        ]);

        // Compute max qty for popularity normalization
        const maxQty = Math.max(...items.map((i) => i.total_qty_sold), 1);

        const mapped: AnalyticsItem[] = items.map((i) => ({
          ...i,
          classification: normalizeClass(i.menu_class),
          popularity_score: i.total_qty_sold / maxQty,
        }));
        setAnalytics(mapped);

        // Map combos to upsell display
        const rules: UpsellDisplay[] = combosRes.combos.slice(0, 10).map((c) => ({
          base_item: c.antecedent,
          suggested_item: c.consequent,
          confidence_score: c.confidence,
        }));
        setUpsellRules(rules);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-accent" />
      </div>
    );
  }

  const filtered =
    activeClass === "All"
      ? analytics
      : analytics.filter((a) => a.classification === activeClass);

  const classCounts = {
    Star: analytics.filter((a) => a.classification === "Star").length,
    Plowhorse: analytics.filter((a) => a.classification === "Plowhorse").length,
    Puzzle: analytics.filter((a) => a.classification === "Puzzle").length,
    Dog: analytics.filter((a) => a.classification === "Dog").length,
  };

  const highMarginLowSales = analytics
    .filter((a) => a.classification === "Puzzle")
    .sort((a, b) => b.contribution_margin - a.contribution_margin)
    .slice(0, 5);

  const underperforming = analytics
    .filter((a) => a.classification === "Dog")
    .sort((a, b) => a.total_revenue - b.total_revenue)
    .slice(0, 5);

  const avgAOV =
    analytics.length > 0
      ? analytics.reduce((s, a) => s + (a.price ?? 0), 0) / analytics.length
      : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-text-primary">Revenue Insights</h1>
        <p className="mt-1 text-sm text-text-muted">
          Menu engineering analysis and optimization recommendations
        </p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Classification Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {(["Star", "Plowhorse", "Puzzle", "Dog"] as MenuClass[]).map((cls) => (
            <motion.button
              key={cls}
              variants={animItem}
              onClick={() => setActiveClass(activeClass === cls ? "All" : cls)}
              className={`rounded-card border p-4 text-left transition-all ${
                activeClass === cls
                  ? "border-accent bg-accent-muted"
                  : "border-surface-border bg-surface-card hover:border-accent/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: CLASS_COLORS[cls] }}
                />
                <span className="text-lg font-semibold text-text-primary">
                  {classCounts[cls]}
                </span>
              </div>
              <p className="text-sm font-medium text-text-primary">
                {CLASS_LABELS[cls].label}
              </p>
              <p className="mt-0.5 text-[11px] text-text-muted leading-snug">
                {CLASS_LABELS[cls].desc}
              </p>
            </motion.button>
          ))}
        </div>

        {/* Scatter Plot — Menu Engineering Matrix */}
        <motion.div
          variants={animItem}
          className="rounded-card border border-surface-border bg-surface-card p-5"
        >
          <h3 className="text-[13px] font-medium text-text-muted mb-4">
            Menu Engineering Matrix
          </h3>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis
                  dataKey="popularity_score"
                  name="Popularity"
                  tick={{ fontSize: 12, fill: "#8A8A8A" }}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: "Popularity Score",
                    position: "bottom",
                    offset: 5,
                    style: { fontSize: 12, fill: "#8A8A8A" },
                  }}
                />
                <YAxis
                  dataKey="margin_pct"
                  name="Margin %"
                  tick={{ fontSize: 12, fill: "#8A8A8A" }}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: "Margin %",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 12, fill: "#8A8A8A" },
                  }}
                />
                <ZAxis dataKey="total_revenue" range={[40, 400]} />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.[0]) return null;
                    const d = payload[0].payload as AnalyticsItem;
                    return (
                      <div className="rounded-lg border border-surface-border bg-white p-3 shadow-sm text-[13px]">
                        <p className="font-medium text-text-primary">{d.item_name}</p>
                        <p className="text-text-muted">
                          Margin: {d.margin_pct.toFixed(1)}% | Pop: {(d.popularity_score * 100).toFixed(1)}%
                        </p>
                        <p className="text-text-muted">Revenue: {formatCurrency(d.total_revenue)}</p>
                        <span
                          className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: CLASS_COLORS[d.classification] + "15",
                            color: CLASS_COLORS[d.classification],
                          }}
                        >
                          {d.classification}
                        </span>
                      </div>
                    );
                  }}
                />
                <Scatter data={filtered}>
                  {filtered.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={CLASS_COLORS[entry.classification]}
                      fillOpacity={0.75}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Insights Row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* High Margin Low Sales */}
          <motion.div
            variants={animItem}
            className="rounded-card border border-surface-border bg-surface-card p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-4 w-4 text-accent" />
              <h3 className="text-[13px] font-medium text-text-muted">
                High Margin, Low Sales
              </h3>
            </div>
            <div className="space-y-3">
              {highMarginLowSales.map((i) => (
                <div key={i.item_id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{i.item_name}</p>
                    <p className="text-xs text-text-muted">
                      {i.total_qty_sold} sold · {formatCurrency(i.contribution_margin)} margin
                    </p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-accent" />
                </div>
              ))}
              {highMarginLowSales.length === 0 && (
                <p className="text-sm text-text-muted">No puzzle items found.</p>
              )}
            </div>
            <div className="mt-4 rounded-lg bg-accent-muted p-3">
              <p className="text-xs text-accent font-medium">Recommendation</p>
              <p className="mt-1 text-xs text-text-secondary">
                Promote these items via featured placement, staff recommendations, or combo deals
                to boost their sales volume.
              </p>
            </div>
          </motion.div>

          {/* Underperforming SKUs */}
          <motion.div
            variants={animItem}
            className="rounded-card border border-surface-border bg-surface-card p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h3 className="text-[13px] font-medium text-text-muted">
                Underperforming Items
              </h3>
            </div>
            <div className="space-y-3">
              {underperforming.map((i) => (
                <div key={i.item_id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{i.item_name}</p>
                    <p className="text-xs text-text-muted">
                      {i.total_qty_sold} sold · {formatCurrency(i.total_revenue)} revenue
                    </p>
                  </div>
                  <TrendingDown className="h-4 w-4 text-red-400" />
                </div>
              ))}
              {underperforming.length === 0 && (
                <p className="text-sm text-text-muted">No underperforming items.</p>
              )}
            </div>
            <div className="mt-4 rounded-lg bg-red-50 p-3">
              <p className="text-xs text-red-600 font-medium">Action Needed</p>
              <p className="mt-1 text-xs text-text-secondary">
                Consider removing these items or reworking recipes to improve margin. They occupy
                menu space without contributing to revenue.
              </p>
            </div>
          </motion.div>

          {/* Upsell Opportunities */}
          <motion.div
            variants={animItem}
            className="rounded-card border border-surface-border bg-surface-card p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <StarIcon className="h-4 w-4 text-accent" />
              <h3 className="text-[13px] font-medium text-text-muted">
                Upsell Opportunities
              </h3>
            </div>
            <div className="space-y-3">
              {upsellRules.slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">
                      <span className="font-medium">{r.base_item}</span>
                      <span className="text-text-muted"> → </span>
                      <span className="text-accent font-medium">{r.suggested_item}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-text-muted">
                    {(r.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
              {upsellRules.length === 0 && (
                <p className="text-sm text-text-muted">
                  Add more orders to generate upsell recommendations.
                </p>
              )}
            </div>
            <div className="mt-4 rounded-lg bg-accent-muted p-3">
              <p className="text-xs text-accent font-medium">AOV Strategy</p>
              <p className="mt-1 text-xs text-text-secondary">
                Average item price: {formatCurrency(avgAOV)}. Bundle these pairs to increase
                average order value by 15-25%.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Full Classification Table */}
        <motion.div
          variants={animItem}
          className="rounded-card border border-surface-border bg-surface-card overflow-hidden"
        >
          <div className="p-5 border-b border-surface-border">
            <h3 className="text-[13px] font-medium text-text-muted">
              Complete Menu Analysis ({filtered.length} items)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-surface-border bg-surface-bg">
                  {["Item", "Category", "Price", "Margin", "Margin %", "Qty Sold", "Revenue", "Class"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-[12px] font-medium text-text-muted uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filtered.map((a) => (
                  <tr key={a.item_id} className="hover:bg-surface-bg/50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-text-primary">
                      {a.item_name}
                    </td>
                    <td className="px-5 py-3 text-sm text-text-secondary">{a.category}</td>
                    <td className="px-5 py-3 text-sm text-text-primary">
                      {formatCurrency(a.price ?? 0)}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-text-primary">
                      {formatCurrency(a.contribution_margin)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-sm font-medium ${
                          a.margin_pct >= 60
                            ? "text-emerald-600"
                            : a.margin_pct >= 40
                            ? "text-accent"
                            : "text-red-500"
                        }`}
                      >
                        {a.margin_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-text-primary">{a.total_qty_sold}</td>
                    <td className="px-5 py-3 text-sm text-text-primary">
                      {formatCurrency(a.total_revenue)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          background: CLASS_COLORS[a.classification] + "15",
                          color: CLASS_COLORS[a.classification],
                        }}
                      >
                        {a.classification}
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
