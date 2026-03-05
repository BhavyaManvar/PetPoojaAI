"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Package, Mic, Monitor, Filter } from "lucide-react";
import { getOrders, type OrderDoc } from "@/services/orderService";
import { formatCurrency } from "@/utils/helpers";

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

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  useEffect(() => {
    getOrders(100)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter((o) => {
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchSource = sourceFilter === "all" || o.order_source === sourceFilter;
    return matchStatus && matchSource;
  });

  const statuses = ["all", "pending", "confirmed", "preparing", "completed", "cancelled"];
  const sources = ["all", "voice", "manual", "online"];

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-accent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-text-primary">Order History</h1>
        <p className="mt-1 text-sm text-text-muted">
          View and track all restaurant orders
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        {[
          { label: "Total Orders", value: orders.length },
          {
            label: "Total Revenue",
            value: formatCurrency(orders.reduce((s, o) => s + o.total, 0)),
          },
          {
            label: "Voice Orders",
            value: orders.filter((o) => o.order_source === "voice").length,
          },
          {
            label: "Completed",
            value: orders.filter((o) => o.status === "completed").length,
          },
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

      {/* Orders list */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-3"
      >
        {filtered.map((order) => {
          const SourceIcon = SOURCE_ICONS[order.order_source] || Package;
          return (
            <div
              key={order.id}
              className="rounded-card border border-surface-border bg-surface-card p-5 hover:border-accent/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-bg">
                    <SourceIcon className="h-4 w-4 text-text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Order #{order.id?.slice(-6).toUpperCase()}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-3 w-3 text-text-muted" />
                      <span className="text-xs text-text-muted">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </span>
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
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {order.items.map((item, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-surface-bg px-2.5 py-1 text-xs text-text-secondary"
                  >
                    {item.quantity}x {item.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex h-[30vh] items-center justify-center">
            <p className="text-sm text-text-muted">No orders found.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
