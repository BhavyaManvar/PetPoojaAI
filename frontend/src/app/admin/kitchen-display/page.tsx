"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Flame,
  Truck,
  Phone,
  Monitor,
  Mic,
  UtensilsCrossed,
} from "lucide-react";
import {
  fetchActiveKots,
  fetchAllKots,
  fetchKotStats,
  updateKotStatus,
} from "@/services/api";
import type { Kot, KotStats } from "@/services/api";
import { formatCurrency } from "@/utils/helpers";

const STATUS_FLOW = ["received", "preparing", "ready", "served"] as const;

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  received: { bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700", label: "Received" },
  preparing: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", label: "Preparing" },
  ready: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "Ready" },
  served: { bg: "bg-gray-50 border-gray-200", text: "text-gray-500", label: "Served" },
};

const SOURCE_ICONS: Record<string, typeof Phone> = {
  phone_call: Phone,
  voice: Mic,
  manual: Monitor,
  online: Monitor,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export default function KitchenDisplayPage() {
  const [kots, setKots] = useState<Kot[]>([]);
  const [stats, setStats] = useState<KotStats | null>(null);
  const [view, setView] = useState<"active" | "all">("active");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [kotsRes, statsRes] = await Promise.all([
        view === "active" ? fetchActiveKots() : fetchAllKots(),
        fetchKotStats(),
      ]);
      setKots(kotsRes.kots);
      setStats(statsRes);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000); // auto-refresh every 10s
    return () => clearInterval(interval);
  }, [load]);

  const handleStatusUpdate = async (kotId: string, newStatus: string) => {
    setUpdating(kotId);
    try {
      await updateKotStatus(kotId, newStatus);
      await load();
    } catch {
      /* ignore */
    } finally {
      setUpdating(null);
    }
  };

  const getNextStatus = (current: string) => {
    const idx = STATUS_FLOW.indexOf(current as typeof STATUS_FLOW[number]);
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ChefHat className="h-7 w-7 text-accent" />
            Kitchen Display (KOT)
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Real-time kitchen order tickets — auto-generated on order confirmation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-surface-border overflow-hidden text-sm">
            <button
              onClick={() => setView("active")}
              className={`px-4 py-2 transition-colors ${
                view === "active" ? "bg-accent text-white" : "bg-surface-card text-text-secondary hover:bg-surface-bg"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setView("all")}
              className={`px-4 py-2 transition-colors ${
                view === "all" ? "bg-accent text-white" : "bg-surface-card text-text-secondary hover:bg-surface-bg"
              }`}
            >
              All
            </button>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm text-text-secondary hover:bg-surface-bg transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Received" value={stats.received} color="yellow" icon={<Clock className="h-5 w-5" />} />
          <StatCard label="Preparing" value={stats.preparing} color="blue" icon={<Flame className="h-5 w-5" />} />
          <StatCard label="Ready" value={stats.ready} color="emerald" icon={<CheckCircle2 className="h-5 w-5" />} />
          <StatCard label="Served" value={stats.served} color="gray" icon={<Truck className="h-5 w-5" />} />
          <StatCard
            label="Avg Prep Time"
            value={`${stats.avg_prep_time_min}m`}
            color="accent"
            icon={<UtensilsCrossed className="h-5 w-5" />}
          />
        </div>
      )}

      {/* KOT Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-muted">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading kitchen tickets...
        </div>
      ) : kots.length === 0 ? (
        <div className="text-center py-20 text-text-muted">
          <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No {view === "active" ? "active" : ""} kitchen tickets</p>
          <p className="text-sm mt-1">New orders will appear here automatically</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {kots.map((kot) => (
              <KotCard
                key={kot.kot_id}
                kot={kot}
                onStatusUpdate={handleStatusUpdate}
                nextStatus={getNextStatus(kot.status)}
                isUpdating={updating === kot.kot_id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ── Stat Card ─────────────────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number | string;
  color: string;
  icon: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    gray: "bg-gray-50 text-gray-500 border-gray-100",
    accent: "bg-accent-muted text-accent border-accent/10",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] ?? colorMap.gray}`}>
      <div className="flex items-center gap-2 mb-1 opacity-70">{icon}<span className="text-xs font-medium uppercase tracking-wide">{label}</span></div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

/* ── KOT Card ──────────────────────────────────────────────────────────── */
function KotCard({
  kot,
  onStatusUpdate,
  nextStatus,
  isUpdating,
}: {
  kot: Kot;
  onStatusUpdate: (id: string, status: string) => void;
  nextStatus: string | null;
  isUpdating: boolean;
}) {
  const style = STATUS_STYLES[kot.status] ?? STATUS_STYLES.received;
  const SourceIcon = SOURCE_ICONS[kot.order_source] ?? Monitor;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-xl border-2 ${style.bg} p-4 flex flex-col gap-3 transition-all`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-text-primary text-sm">{kot.kot_id}</span>
            {kot.priority === "high" && (
              <span className="flex items-center gap-1 text-[10px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                <AlertTriangle className="h-3 w-3" /> HIGH
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Order #{kot.order_id} · <SourceIcon className="inline h-3 w-3 -mt-0.5" /> {kot.order_source}
          </p>
        </div>
        <div className="text-right">
          <span className={`inline-block text-xs font-bold px-2 py-1 rounded-lg ${style.text} ${style.bg}`}>
            {style.label}
          </span>
          <p className="text-[10px] text-text-muted mt-1">{timeAgo(kot.created_at)}</p>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1.5">
        {kot.items.map((item, idx) => (
          <div key={idx} className="flex items-start justify-between bg-white/60 rounded-lg px-3 py-2 text-sm">
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-text-primary">{item.qty}x</span>{" "}
              <span className="text-text-primary">{item.item_name}</span>
              {item.modifiers && (
                <p className="text-[11px] text-accent font-medium mt-0.5">{item.modifiers}</p>
              )}
            </div>
            <div className="text-right shrink-0 ml-2">
              <span className="text-[10px] text-text-muted">{item.station}</span>
              <p className="text-[10px] text-text-muted">{item.prep_time_min}m</p>
            </div>
          </div>
        ))}
      </div>

      {/* Stations & Time */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>Stations: {kot.stations.join(", ")}</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> ~{kot.estimated_prep_min}m
        </span>
      </div>

      {/* Delivery address */}
      {kot.delivery_address && (
        <p className="text-xs text-text-muted truncate">
          📍 {kot.delivery_address}
        </p>
      )}

      {/* Action Button */}
      {nextStatus && (
        <button
          onClick={() => onStatusUpdate(kot.kot_id, nextStatus)}
          disabled={isUpdating}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            nextStatus === "preparing"
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : nextStatus === "ready"
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : "bg-gray-500 text-white hover:bg-gray-600"
          } disabled:opacity-50`}
        >
          {isUpdating ? "Updating..." : `Mark as ${STATUS_STYLES[nextStatus]?.label ?? nextStatus}`}
        </button>
      )}
    </motion.div>
  );
}
