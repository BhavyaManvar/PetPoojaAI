"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Combine,
  Mic,
} from "lucide-react";
import { cn } from "@/utils/helpers";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/menu-intelligence", label: "Menu Intelligence", icon: UtensilsCrossed },
  { href: "/combos", label: "Combos & Upsell", icon: Combine },
  { href: "/voice-copilot", label: "Voice Copilot", icon: Mic },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 border-r border-[var(--border)] bg-[var(--card)] lg:block">
      <div className="flex h-16 items-center gap-2 border-b border-[var(--border)] px-6">
        <span className="text-2xl">🍽️</span>
        <span className="text-lg font-bold">PetPooja AI</span>
      </div>
      <nav className="space-y-1 p-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === href
                ? "bg-brand-500/10 text-brand-600"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
