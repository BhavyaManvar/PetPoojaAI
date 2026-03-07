"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Pencil, Search, Check, X, RefreshCw } from "lucide-react";
import {
  fetchAdminMenuList,
  updateMenuItemPrice,
  type AdminMenuItem,
} from "@/services/api";
import { formatCurrency } from "@/utils/helpers";

export default function MenuManagerPage() {
  const [items, setItems] = useState<AdminMenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminMenuList();
      setItems(data.items);
      setCategories(data.categories);
    } catch (err) {
      console.error("Failed to load menu:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filtered = items.filter((i) => {
    const matchSearch = i.item_name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "All" || i.category === catFilter;
    return matchSearch && matchCat;
  });

  const allCategories = ["All", ...categories];

  const startEdit = (item: AdminMenuItem) => {
    setEditingId(item.item_id);
    setEditPrice(String(item.price));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPrice("");
  };

  const savePrice = async (itemId: number) => {
    const newPrice = parseFloat(editPrice);
    if (isNaN(newPrice) || newPrice <= 0) return;
    setSaving(true);
    try {
      await updateMenuItemPrice(itemId, newPrice);
      setEditingId(null);
      await loadItems();
    } catch (err) {
      console.error("Failed to update price:", err);
    } finally {
      setSaving(false);
    }
  };

  const totalItems = items.length;
  const avgPrice = items.length > 0 ? items.reduce((s, i) => s + i.price, 0) / items.length : 0;
  const avgMargin = items.length > 0 ? items.reduce((s, i) => s + i.margin_pct, 0) / items.length : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Menu Manager</h1>
          <p className="mt-1 text-sm text-text-muted">
            {totalItems} items · Avg price {formatCurrency(avgPrice)} · Avg margin{" "}
            {avgMargin.toFixed(1)}%
          </p>
        </div>
        <button
          onClick={loadItems}
          className="flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-bg transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        {[
          { label: "Total Items", value: totalItems },
          { label: "Categories", value: categories.length },
          { label: "Avg Price", value: formatCurrency(avgPrice) },
          { label: "Avg Margin", value: `${avgMargin.toFixed(1)}%` },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-card border border-surface-border bg-surface-card p-4"
          >
            <p className="text-[12px] font-medium text-text-muted">{c.label}</p>
            <p className="mt-1.5 text-xl font-semibold text-text-primary">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-surface-border bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-accent placeholder:text-text-muted"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                catFilter === cat
                  ? "bg-btn text-white"
                  : "bg-surface-card border border-surface-border text-text-secondary hover:bg-surface-bg"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-accent" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-card border border-surface-border bg-surface-card overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-surface-border bg-surface-bg">
                  <th className="px-5 py-3 text-[12px] font-medium text-text-muted uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-5 py-3 text-[12px] font-medium text-text-muted uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-5 py-3 text-[12px] font-medium text-text-muted uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-5 py-3 text-[12px] font-medium text-text-muted uppercase tracking-wider text-right">
                    Price
                  </th>
                  <th className="px-5 py-3 text-[12px] font-medium text-text-muted uppercase tracking-wider text-right">
                    Food Cost
                  </th>
                  <th className="px-5 py-3 text-[12px] font-medium text-text-muted uppercase tracking-wider text-right">
                    Margin
                  </th>
                  <th className="px-5 py-3 text-[12px] font-medium text-text-muted uppercase tracking-wider text-right">
                    Margin %
                  </th>
                  <th className="px-5 py-3 text-[12px] font-medium text-text-muted uppercase tracking-wider text-right">
                    Monthly Sales
                  </th>
                  <th className="px-5 py-3 text-[12px] font-medium text-text-muted uppercase tracking-wider text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filtered.map((item) => (
                  <tr
                    key={item.item_id}
                    className="hover:bg-surface-bg/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-xs text-text-muted">
                      {item.item_id}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-text-primary">
                      {item.item_name}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full bg-surface-bg px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-primary text-right">
                      {editingId === item.item_id ? (
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") savePrice(item.item_id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          autoFocus
                          className="w-24 rounded border border-accent px-2 py-1 text-sm text-right outline-none"
                        />
                      ) : (
                        formatCurrency(item.price)
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary text-right">
                      {formatCurrency(item.cost)}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-text-primary text-right">
                      {formatCurrency(item.margin)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={`text-sm font-medium ${
                          item.margin_pct >= 60
                            ? "text-emerald-600"
                            : item.margin_pct >= 40
                            ? "text-accent"
                            : "text-red-500"
                        }`}
                      >
                        {item.margin_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary text-right">
                      {item.monthly_sales}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {editingId === item.item_id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => savePrice(item.item_id)}
                            disabled={saving}
                            className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Save"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(item)}
                          className="rounded p-1.5 text-text-muted hover:bg-surface-bg hover:text-text-primary transition-colors"
                          title="Edit Price"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-12 text-center text-sm text-text-muted"
                    >
                      No menu items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
