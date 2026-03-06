"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import {
  getMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  type MenuItemDoc,
} from "@/services/menuService";
import { formatCurrency } from "@/utils/helpers";
import { useAuth } from "@/contexts/AuthContext";

const CATEGORIES = [
  "Starters",
  "Main Course",
  "Breads",
  "Rice & Biryani",
  "Desserts",
  "Beverages",
  "Snacks",
  "Sides",
];

interface FormData {
  name: string;
  price: string;
  food_cost: string;
  category: string;
  modifiers: string;
}

const emptyForm: FormData = {
  name: "",
  price: "",
  food_cost: "",
  category: CATEGORIES[0],
  modifiers: "",
};

export default function MenuManagerPage() {
  const { appUser } = useAuth();
  const [items, setItems] = useState<MenuItemDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const isAdmin = appUser?.role === "admin";

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await getMenuItems();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const filtered = items.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "All" || i.category === catFilter;
    return matchSearch && matchCat;
  });

  const categories = ["All", ...new Set(items.map((i) => i.category))];

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item: MenuItemDoc) => {
    setEditingId(item.id!);
    setForm({
      name: item.name,
      price: String(item.price),
      food_cost: String(item.food_cost),
      category: item.category,
      modifiers: item.modifiers?.join(", ") || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        price: parseFloat(form.price),
        food_cost: parseFloat(form.food_cost),
        category: form.category,
        modifiers: form.modifiers
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
      };

      if (editingId) {
        await updateMenuItem(editingId, data);
      } else {
        await addMenuItem(data);
      }
      setShowModal(false);
      await loadItems();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteMenuItem(id);
      await loadItems();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Menu Manager</h1>
          <p className="mt-1 text-sm text-text-muted">
            Manage your restaurant menu items and pricing
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-btn px-4 py-2.5 text-sm font-medium text-white hover:bg-btn-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        )}
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
          {categories.map((cat) => (
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
                  {isAdmin && (
                    <th className="px-5 py-3 text-[12px] font-medium text-text-muted uppercase tracking-wider text-right">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filtered.map((item) => {
                  const margin = item.price - item.food_cost;
                  const marginPct = item.price > 0 ? (margin / item.price) * 100 : 0;
                  return (
                    <tr key={item.id} className="hover:bg-surface-bg/50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-text-primary">
                        {item.name}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-surface-bg px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-text-primary text-right">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-text-secondary text-right">
                        {formatCurrency(item.food_cost)}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-text-primary text-right">
                        {formatCurrency(margin)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span
                          className={`text-sm font-medium ${
                            marginPct >= 60
                              ? "text-emerald-600"
                              : marginPct >= 40
                              ? "text-accent"
                              : "text-red-500"
                          }`}
                        >
                          {marginPct.toFixed(1)}%
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(item)}
                              className="rounded p-1.5 text-text-muted hover:bg-surface-bg hover:text-text-primary transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id!)}
                              className="rounded p-1.5 text-text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-text-muted">
                      No menu items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-text-primary">
                {editingId ? "Edit Item" : "Add Menu Item"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded p-1 text-text-muted hover:bg-surface-bg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1">
                  Item Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-accent"
                  placeholder="Butter Chicken"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-accent"
                    placeholder="350"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1">
                    Food Cost (₹)
                  </label>
                  <input
                    type="number"
                    value={form.food_cost}
                    onChange={(e) => setForm({ ...form, food_cost: e.target.value })}
                    className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-accent"
                    placeholder="120"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1">
                  Modifiers (comma separated)
                </label>
                <input
                  value={form.modifiers}
                  onChange={(e) => setForm({ ...form, modifiers: e.target.value })}
                  className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-accent"
                  placeholder="spicy, extra cheese, no onion"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2.5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-surface-border py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-bg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.price || !form.food_cost}
                className="flex-1 rounded-lg bg-btn py-2.5 text-sm font-medium text-white hover:bg-btn-hover transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Add Item"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
