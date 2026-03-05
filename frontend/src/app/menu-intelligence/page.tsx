"use client";

import { useState } from "react";
import { useMenuInsights, useHiddenStars, useRiskItems } from "@/hooks/useMenu";
import { DataTable } from "@/components/tables/data-table";
import { formatCurrency } from "@/utils/helpers";
import { cn } from "@/utils/helpers";
import type { MenuItem, HiddenStar, RiskItem } from "@/types/menu";

const TABS = ["BCG Matrix", "Hidden Stars", "Risk Items"] as const;
type Tab = (typeof TABS)[number];

const quadrantBadge: Record<string, string> = {
  Star: "bg-amber-100 text-amber-800",
  "Plow Horse": "bg-blue-100 text-blue-800",
  Puzzle: "bg-purple-100 text-purple-800",
  Dog: "bg-red-100 text-red-800",
};

export default function MenuIntelligencePage() {
  const [tab, setTab] = useState<Tab>("BCG Matrix");
  const insights = useMenuInsights();
  const hiddenStars = useHiddenStars();
  const riskItems = useRiskItems();

  const menuColumns = [
    { key: "item_name", header: "Item" },
    {
      key: "quadrant",
      header: "Quadrant",
      render: (r: MenuItem) => (
        <span
          className={cn(
            "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
            quadrantBadge[r.quadrant] ?? "bg-gray-100 text-gray-800"
          )}
        >
          {r.quadrant}
        </span>
      ),
    },
    { key: "category", header: "Category" },
    {
      key: "price",
      header: "Price",
      className: "text-right",
      render: (r: MenuItem) => formatCurrency(r.price),
    },
    {
      key: "contribution_margin",
      header: "Margin",
      className: "text-right",
      render: (r: MenuItem) => formatCurrency(r.contribution_margin),
    },
    {
      key: "total_qty",
      header: "Qty Sold",
      className: "text-right",
    },
  ];

  const hiddenStarColumns = [
    { key: "item_name", header: "Item" },
    {
      key: "margin",
      header: "Margin",
      className: "text-right",
      render: (r: HiddenStar) => formatCurrency(r.margin),
    },
    {
      key: "total_qty",
      header: "Qty Sold",
      className: "text-right",
    },
    { key: "reason", header: "Reason" },
  ];

  const riskColumns = [
    { key: "item_name", header: "Item" },
    {
      key: "margin",
      header: "Margin",
      className: "text-right",
      render: (r: RiskItem) => formatCurrency(r.margin),
    },
    {
      key: "total_qty",
      header: "Qty Sold",
      className: "text-right",
    },
    { key: "reason", header: "Reason" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Menu Intelligence</h1>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              tab === t
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "BCG Matrix" && (
        <DataTable
          columns={menuColumns}
          data={(insights.data ?? []) as Record<string, unknown>[]}
          emptyMessage={insights.isLoading ? "Loading..." : "No menu data"}
        />
      )}

      {tab === "Hidden Stars" && (
        <DataTable
          columns={hiddenStarColumns}
          data={(hiddenStars.data ?? []) as Record<string, unknown>[]}
          emptyMessage={hiddenStars.isLoading ? "Loading..." : "No hidden stars found"}
        />
      )}

      {tab === "Risk Items" && (
        <DataTable
          columns={riskColumns}
          data={(riskItems.data ?? []) as Record<string, unknown>[]}
          emptyMessage={riskItems.isLoading ? "Loading..." : "No risk items found"}
        />
      )}
    </div>
  );
}
