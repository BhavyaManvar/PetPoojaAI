"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ClipboardList, Clock, CheckCircle } from "lucide-react";
import { fetchOrders } from "@/services/api";
import { formatCurrency } from "@/utils/helpers";

export default function OrderHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["order-history"],
    queryFn: () => fetchOrders(30),
    staleTime: 10_000,
  });

  const orders = data?.orders || [];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">My Orders</h1>
        <p className="text-sm text-text-muted mt-1">Track your recent orders</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white border border-surface-border p-5 animate-pulse">
              <div className="h-4 bg-surface-bg rounded w-1/3 mb-2" />
              <div className="h-3 bg-surface-bg rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <ClipboardList className="mx-auto h-12 w-12 text-text-muted mb-4" />
          <p className="text-sm text-text-muted">No orders yet. Start ordering from the menu!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order, i) => (
            <motion.div
              key={order.order_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl bg-white border border-surface-border p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary">
                    Order #{order.order_id}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    order.status === "completed"
                      ? "bg-emerald-50 text-emerald-700"
                      : order.status === "confirmed" || order.status === "preparing"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-surface-bg text-text-muted"
                  }`}>
                    {order.status === "completed" ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {order.status}
                  </span>
                </div>
                <p className="text-sm font-bold text-text-primary">
                  {formatCurrency(order.total_price)}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span>{order.items?.length || 0} items</span>
                {order.order_source && <span className="capitalize">{order.order_source}</span>}
                {order.created_at && (
                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
