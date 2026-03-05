"use client";

import { useState } from "react";
import { useCombos } from "@/hooks/useCombos";
import { fetchUpsell } from "@/services/api";
import { DataTable } from "@/components/tables/data-table";
import type { Combo, UpsellResult } from "@/types/order";

export default function CombosPage() {
  const { data: combos, isLoading } = useCombos();
  const [itemId, setItemId] = useState("");
  const [upsellResult, setUpsellResult] = useState<UpsellResult | null>(null);
  const [upsellLoading, setUpsellLoading] = useState(false);
  const [upsellError, setUpsellError] = useState("");

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

  const handleUpsell = async () => {
    const id = parseInt(itemId.trim(), 10);
    if (isNaN(id)) {
      setUpsellError("Please enter a valid item ID (number).");
      return;
    }
    setUpsellLoading(true);
    setUpsellError("");
    setUpsellResult(null);
    try {
      const result = await fetchUpsell(id);
      setUpsellResult(result);
    } catch {
      setUpsellError("Failed to fetch upsell. Check if the backend is running.");
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
          Enter a menu item ID to get AI-powered upsell recommendations
        </p>
        <div className="flex gap-3">
          <input
            type="number"
            min={1}
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUpsell()}
            placeholder="e.g. 1"
            className="w-40 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            onClick={handleUpsell}
            disabled={upsellLoading || !itemId.trim()}
            className="rounded-lg bg-amber-500 px-6 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {upsellLoading ? "Loading..." : "Get Upsells"}
          </button>
        </div>

        {upsellError && (
          <p className="text-sm text-red-500">{upsellError}</p>
        )}

        {upsellResult && (
          <div className="space-y-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--muted-foreground)]">Item:</span>
                <span className="font-semibold">{upsellResult.item}</span>
              </div>
              {upsellResult.recommended_addon ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--muted-foreground)]">Recommended Add-on:</span>
                    <span className="rounded-full bg-green-100 px-3 py-0.5 text-sm font-semibold text-green-800">
                      {upsellResult.recommended_addon}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--muted-foreground)]">Strategy:</span>
                    <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-800">
                      {upsellResult.strategy}
                    </span>
                  </div>
                  {upsellResult.confidence != null && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--muted-foreground)]">Confidence:</span>
                      <span className="text-sm">{(upsellResult.confidence * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">No upsell recommendation found for this item.</p>
              )}
            </div>

            {upsellResult.alternatives && upsellResult.alternatives.length > 0 && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                <p className="text-sm font-medium text-[var(--muted-foreground)] mb-2">Alternatives:</p>
                <div className="flex flex-wrap gap-2">
                  {upsellResult.alternatives.map((alt, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1 text-xs"
                    >
                      {alt.addon}{" "}
                      <span className="text-[var(--muted-foreground)]">({alt.strategy})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
