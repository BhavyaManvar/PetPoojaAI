"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  TrendingUp,
  Mic,
  ClipboardList,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/utils/helpers";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/menu-manager", label: "Menu Manager", icon: UtensilsCrossed },
  { href: "/revenue-insights", label: "Revenue Insights", icon: TrendingUp },
  { href: "/voice-copilot", label: "Voice Orders", icon: Mic },
  { href: "/order-history", label: "Order History", icon: ClipboardList },
  { href: "/staff", label: "Staff Management", icon: Users, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { appUser, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-surface-border bg-surface-card transition-all duration-200",
        collapsed ? "w-[68px]" : "w-[248px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-surface-border px-4">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-btn text-white text-sm font-bold">
            R
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="whitespace-nowrap text-sm font-semibold text-text-primary"
              >
                Revenue Copilot
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-muted hover:bg-surface-bg transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-3">
        {NAV_ITEMS
          .filter((item) => !("adminOnly" in item && item.adminOnly) || appUser?.role === "admin")
          .map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-accent-muted text-accent"
                  : "text-text-secondary hover:bg-surface-bg hover:text-text-primary"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-surface-border p-3">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-bg text-xs font-semibold text-text-secondary">
            {appUser?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <p className="truncate text-[13px] font-medium text-text-primary">
                  {appUser?.name || "User"}
                </p>
                <p className="truncate text-[11px] text-text-muted capitalize">
                  {appUser?.role || "staff"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <button
              onClick={signOut}
              className="ml-auto shrink-0 rounded p-1.5 text-text-muted hover:bg-surface-bg hover:text-text-primary transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
