"use client";

import { useState } from "react";
import { useCombos } from "@/hooks/useCombos";
import { fetchUpsell } from "@/services/api";
import { DataTable } from "@/components/tables/data-table";
import { formatCurrency } from "@/utils/helpers";
import type { Combo, UpsellResult } from "@/types/order";

export default function CombosPage() {
  const { data: combos, isLoading } = useCombos();
  const [itemName, setItemName] = useState("");
  const [upsells, setUpsells] = useState<UpsellResult[]>([]);
  const [upsellLoading, setUpsellLoading] = useState(false);

  const comboColumns = [
    { key: "antecedent", header: "If Customer Orders" },
    { key: "consequent", header: "Suggest Also" },
    {
      key: "confidence",
      header: "Confidence",
      className: "text-right",
      render: (r: Combo) => `${(r.confidence * 100).toFixed(0)}%`,
    },
    {
      key: "lift",
      header: "Lift",
      className: "text-right",
      render: (r: Combo) => (r.lift ?? 0).toFixed(2),
    },
    {
      key: "support",
      header: "Support",
      className: "text-right",
      render: (r: Combo) => `${(r.support * 100).toFixed(1)}%`,
    },
  ];

  const upsellColumns = [
    { key: "recommended_item", header: "Recommended Item" },
    { key: "strategy", header: "Strategy" },
    {
      key: "confidence",
      header: "Confidence",
      className: "text-right",
      render: (r: UpsellResult) =>
        r.confidence != null ? `${(r.confidence * 100).toFixed(0)}%` : "—",
    },
    {
      key: "margin",
      header: "Margin",
      className: "text-right",
      render: (r: UpsellResult) =>
        r.margin != null ? formatCurrency(r.margin) : "—",
    },
  ];

  const handleUpsell = async () => {
    const trimmed = itemName.trim();
    if (!trimmed) return;
    setUpsellLoading(true);
    try {
      const results = await fetchUpsell(trimmed);
      setUpsells(results);
    } catch {
      setUpsells([]);
    } finally {
      setUpsellLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Combos &amp; Upsell</h1>

      {/* Combo Rules Table */}
      <DataTable
        title="Top Combo Rules (Association Mining)"
        columns={comboColumns}
        data={(combos ?? []) as Record<string, unknown>[]}
        emptyMessage={isLoading ? "Mining combos..." : "No combo rules found"}
      />

      {/* Upsell Finder */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold">Upsell Finder</h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          Enter an item name to get upsell recommendations
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUpsell()}
            placeholder="e.g. Butter Chicken"
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            onClick={handleUpsell}
            disabled={upsellLoading || !itemName.trim()}
            className="rounded-lg bg-amber-500 px-6 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {upsellLoading ? "Loading..." : "Get Upsells"}
          </button>
        </div>

        {upsells.length > 0 && (
          <DataTable
            columns={upsellColumns}
            data={upsells as Record<string, unknown>[]}
            emptyMessage="No upsell suggestions"
          />
        )}
      </div>
    </div>
  );
}
