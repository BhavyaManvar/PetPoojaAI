"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Package,
  Mic,
  Monitor,
  Filter,
  RefreshCw,
  Database,
  ShoppingBag,
} from "lucide-react";
import { fetchOrders, seedOrders } from "@/services/api";
import { formatCurrency } from "@/utils/helpers";

/* ---------- types (aligned to backend OrderResponse) ---------- */
interface BackendOrderItem {
  item_id: number;
  item_name: string;
  category: string;
  qty: number;
  unit_price: number;
  line_total: number;
}
interface BackendOrder {
  order_id: number;
  status: string;
  total_price: number;
  order_source: string;
  created_at: string;
  items: BackendOrderItem[];
}

/* ---------- constants ---------- */
const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-600",
  confirmed: "bg-blue-50 text-blue-600",
  preparing: "bg-accent-muted text-accent",
  completed: "bg-emerald-50 text-emerald-600",
  cancelled: "bg-red-50 text-red-500",
};

const SOURCE_ICONS: Record<string, typeof Mic> = {
  voice: Mic,
  manual: Package,
  online: Monitor,
};

const SOURCE_LABEL: Record<string, string> = {
  voice: "Voice Order",
  manual: "Manual / POS",
  online: "Online",
};

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOrders(200);
      setOrders(data.orders as unknown as BackendOrder[]);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedOrders(25);
      await load();
    } catch (err) {
      console.error("Seed failed:", err);
    } finally {
      setSeeding(false);
    }
  };

  const filtered = orders.filter((o) => {
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchSource = sourceFilter === "all" || o.order_source === sourceFilter;
    return matchStatus && matchSource;
  });

  const statuses = ["all", "pending", "confirmed", "preparing", "completed", "cancelled"];
  const sources = ["all", "voice", "manual", "online"];

  const totalRevenue = orders.reduce((s, o) => s + o.total_price, 0);
  const voiceCount = orders.filter((o) => o.order_source === "voice").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-accent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Order History</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Live · auto-refreshes every 10 s&nbsp;·&nbsp;
            <span className="font-medium text-text-secondary">{total} total</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-bg transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-1.5 rounded-lg bg-btn px-3 py-1.5 text-xs font-medium text-white hover:bg-btn-hover transition-colors disabled:opacity-50"
          >
            <Database className="h-3.5 w-3.5" />
            {seeding ? "Seeding…" : "Seed Demo Orders"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        {[
          { label: "Total Orders", value: orders.length, icon: ShoppingBag },
          { label: "Total Revenue", value: formatCurrency(totalRevenue), icon: Package },
          { label: "Voice Orders", value: voiceCount, icon: Mic },
          { label: "Completed", value: completedCount, icon: Clock },
        ].map((c) => (
          <div key={c.label} className="rounded-card border border-surface-border bg-surface-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium text-text-muted">{c.label}</p>
              <c.icon className="h-4 w-4 text-text-muted" />
            </div>
            <p className="mt-1.5 text-xl font-semibold text-text-primary">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-text-muted" />
          <span className="text-[13px] text-text-muted">Status:</span>
          <div className="flex gap-1">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-btn text-white"
                    : "bg-surface-card border border-surface-border text-text-secondary hover:bg-surface-bg"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] text-text-muted">Source:</span>
          <div className="flex gap-1">
            {sources.map((s) => (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  sourceFilter === s
                    ? "bg-btn text-white"
                    : "bg-surface-card border border-surface-border text-text-secondary hover:bg-surface-bg"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {orders.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[40vh] gap-4">
          <Database className="h-12 w-12 text-text-muted" />
          <p className="text-sm text-text-muted">
            No orders yet. Click <strong>Seed Demo Orders</strong> to generate sample data, or place an order via the Voice Copilot.
          </p>
        </div>
      )}

      {/* Orders list */}
      {orders.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {filtered.map((order) => {
            const SourceIcon = SOURCE_ICONS[order.order_source] || Package;
            const sourceLabel = SOURCE_LABEL[order.order_source] || order.order_source;
            return (
              <div
                key={order.order_id}
                className="rounded-card border border-surface-border bg-surface-card p-5 hover:border-accent/20 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-bg">
                      <SourceIcon className="h-4 w-4 text-text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        Order #{order.order_id}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="h-3 w-3 text-text-muted" />
                        <span className="text-xs text-text-muted">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </span>
                        <span className="text-xs text-text-muted">· {sourceLabel}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        STATUS_STYLES[order.status] || "bg-gray-50 text-gray-500"
                      }`}
                    >
                      {order.status}
                    </span>
                    <span className="text-base font-semibold text-text-primary">
                      {formatCurrency(order.total_price)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {order.items.map((item, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-surface-bg px-2.5 py-1 text-xs text-text-secondary"
                    >
                      {item.qty}× {item.item_name}
                      <span className="ml-1 text-text-muted">{formatCurrency(item.line_total)}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && orders.length > 0 && (
            <div className="flex h-[30vh] items-center justify-center">
              <p className="text-sm text-text-muted">No orders match the current filters.</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
