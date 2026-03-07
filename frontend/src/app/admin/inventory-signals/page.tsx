"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Package,
  PackageX,
  PackageCheck,
  Archive,
  ArrowDown,
  ArrowUp,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import {
  fetchInventoryItems,
  fetchInventorySummary,
  type InventoryItem,
  type InventorySummary,
} from "@/services/api";
import { formatCurrency, cn } from "@/utils/helpers";

type StockFilter = "all" | "out_of_stock" | "low" | "adequate" | "overstock";
type SeverityFilter = "all" | "critical" | "warning" | "info" | "ok";

const STOCK_COLORS: Record<string, string> = {
  out_of_stock: "#EF4444",
  low: "#F59E0B",
  adequate: "#10B981",
  overstock: "#6366F1",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
  ok: "#10B981",
};

const CLASS_COLORS: Record<string, string> = {
  Star: "#C47A2C",
  "Plow Horse": "#3B82F6",
  Puzzle: "#8B5CF6",
  Dog: "#EF4444",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const animItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function InventorySignalsPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");

  useEffect(() => {
    (async () => {
      try {
        const [invData, sumData] = await Promise.all([
          fetchInventoryItems(),
          fetchInventorySummary(),
        ]);
        setItems(invData.items);
        setSummary(sumData);
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

  const filtered = items.filter((i) => {
    if (stockFilter !== "all" && i.stock_status !== stockFilter) return false;
    if (severityFilter !== "all" && i.signal_severity !== severityFilter) return false;
    return true;
  });

  const criticalItems = items.filter((i) => i.signal_severity === "critical");
  const warningItems = items.filter((i) => i.signal_severity === "warning");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-text-primary">Inventory Signals</h1>
        <p className="mt-1 text-sm text-text-muted">
          Stock levels linked to menu performance — prioritize restocking by revenue impact
        </p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {([
              { key: "out_of_stock" as const, label: "Out of Stock", icon: PackageX, color: "#EF4444" },
              { key: "low_stock" as const, label: "Low Stock", icon: AlertTriangle, color: "#F59E0B" },
              { key: "adequate" as const, label: "Adequate", icon: PackageCheck, color: "#10B981" },
              { key: "overstock" as const, label: "Overstock", icon: Archive, color: "#6366F1" },
            ] as const).map(({ key, label, icon: Icon, color }) => (
              <motion.button
                key={key}
                variants={animItem}
                onClick={() =>
                  setStockFilter(
                    stockFilter === key.replace("_stock", "").replace("out_of_stock", "out_of_stock") as StockFilter
                      ? "all"
                      : (key === "low_stock" ? "low" : key) as StockFilter
                  )
                }
                className={cn(
                  "rounded-card border p-4 text-left transition-all",
                  stockFilter === (key === "low_stock" ? "low" : key)
                    ? "border-accent bg-accent-muted"
                    : "border-surface-border bg-surface-card hover:border-accent/30"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="h-4 w-4" style={{ color }} />
                  <span className="text-lg font-semibold text-text-primary">{summary[key]}</span>
                </div>
                <p className="text-sm font-medium text-text-primary">{label}</p>
              </motion.button>
            ))}

            {/* At-risk revenue card */}
            <motion.div
              variants={animItem}
              className="rounded-card border border-surface-border bg-surface-card p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                <span className="text-lg font-semibold text-text-primary">
                  {formatCurrency(summary.at_risk_revenue_7d)}
                </span>
              </div>
              <p className="text-sm font-medium text-text-primary">At-Risk Revenue</p>
              <p className="text-[11px] text-text-muted">7-day projected loss</p>
            </motion.div>
          </div>
        )}

        {/* Critical Alerts */}
        {criticalItems.length > 0 && (
          <motion.div
            variants={animItem}
            className="rounded-card border border-red-200 bg-red-50 p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              <h3 className="text-sm font-semibold text-red-800">
                Critical Alerts ({criticalItems.length})
              </h3>
            </div>
            <div className="space-y-2">
              {criticalItems.map((i) => (
                <div
                  key={i.item_id}
                  className="flex items-start justify-between rounded-lg bg-white/70 p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">{i.item_name}</p>
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          background: CLASS_COLORS[i.menu_class] + "15",
                          color: CLASS_COLORS[i.menu_class],
                        }}
                      >
                        {i.menu_class}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">{i.signal_message}</p>
                  </div>
                  <span className="shrink-0 ml-3 rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                    {i.action}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Warning Alerts */}
        {warningItems.length > 0 && (
          <motion.div
            variants={animItem}
            className="rounded-card border border-amber-200 bg-amber-50 p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-800">
                Warnings ({warningItems.length})
              </h3>
            </div>
            <div className="space-y-2">
              {warningItems.map((i) => (
                <div
                  key={i.item_id}
                  className="flex items-start justify-between rounded-lg bg-white/70 p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">{i.item_name}</p>
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          background: CLASS_COLORS[i.menu_class] + "15",
                          color: CLASS_COLORS[i.menu_class],
                        }}
                      >
                        {i.menu_class}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">{i.signal_message}</p>
                  </div>
                  <span className="shrink-0 ml-3 rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                    {i.action}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Severity Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-muted">Filter by signal:</span>
          {(["all", "critical", "warning", "info", "ok"] as SeverityFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all",
                severityFilter === s
                  ? "bg-accent text-white"
                  : "bg-surface-card border border-surface-border text-text-muted hover:border-accent/30"
              )}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Inventory Table */}
        <motion.div
          variants={animItem}
          className="rounded-card border border-surface-border bg-surface-card overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-bg text-left text-xs font-medium text-text-muted">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3 text-right">Reorder Pt</th>
                  <th className="px-4 py-3 text-right">Par Level</th>
                  <th className="px-4 py-3 text-right">Daily Sales</th>
                  <th className="px-4 py-3 text-right">Days Left</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Signal</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr
                    key={i.item_id}
                    className="border-b border-surface-border last:border-0 hover:bg-surface-bg/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">{i.item_name}</td>
                    <td className="px-4 py-3 text-text-muted">{i.category}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          background: (CLASS_COLORS[i.menu_class] || "#888") + "15",
                          color: CLASS_COLORS[i.menu_class] || "#888",
                        }}
                      >
                        {i.menu_class}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-primary">
                      {i.current_stock}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-muted">
                      {i.reorder_point}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-muted">
                      {i.par_level}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-muted">
                      {i.avg_daily_sales}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {i.days_until_stockout != null ? (
                        <span
                          className={cn(
                            "font-medium",
                            i.days_until_stockout <= 1
                              ? "text-red-600"
                              : i.days_until_stockout <= 3
                              ? "text-amber-600"
                              : "text-text-muted"
                          )}
                        >
                          {i.days_until_stockout}d
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          background: (STOCK_COLORS[i.stock_status] || "#888") + "15",
                          color: STOCK_COLORS[i.stock_status] || "#888",
                        }}
                      >
                        {i.stock_status === "low" && <ArrowDown className="h-3 w-3" />}
                        {i.stock_status === "overstock" && <ArrowUp className="h-3 w-3" />}
                        {i.stock_status === "out_of_stock" && <PackageX className="h-3 w-3" />}
                        {i.stock_status === "adequate" && <PackageCheck className="h-3 w-3" />}
                        {i.stock_status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: SEVERITY_COLORS[i.signal_severity] || "#888" }}
                        title={i.signal_severity}
                      />
                      <span className="ml-1.5 text-xs text-text-muted">{i.signal_severity}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-text-muted">{i.action}</span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-sm text-text-muted">
                      No items match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Dead Stock Insight */}
        {summary && summary.dead_stock_value > 0 && (
          <motion.div
            variants={animItem}
            className="rounded-card border border-surface-border bg-surface-card p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-medium text-text-muted">Dead Stock Analysis</h3>
            </div>
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">
                {formatCurrency(summary.dead_stock_value)}
              </span>{" "}
              worth of inventory is tied up in Dog items with overstock.
              Consider running clearance deals or reducing next order quantities to free up capital.
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
