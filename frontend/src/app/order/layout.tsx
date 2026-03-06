"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UtensilsCrossed, ShoppingCart, Mic, ClipboardList, LogOut, Home } from "lucide-react";
import { cn } from "@/utils/helpers";

const NAV_ITEMS = [
  { href: "/order", label: "Menu", icon: UtensilsCrossed },
  { href: "/order/cart", label: "Cart", icon: ShoppingCart },
  { href: "/order/voice", label: "Voice Order", icon: Mic },
  { href: "/order/history", label: "My Orders", icon: ClipboardList },
];

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, demoMode, appUser, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && !demoMode) {
      router.replace("/login");
    }
  }, [user, loading, demoMode, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-accent" />
      </div>
    );
  }

  if (!user && !demoMode) return null;

  return (
    <div className="min-h-screen bg-surface-bg">
      {/* Top navbar for user ordering */}
      <header className="sticky top-0 z-40 border-b border-surface-border bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-btn text-white text-xs font-bold">
              R
            </div>
            <span className="text-sm font-semibold text-text-primary">RestroAI</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/order" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-accent-muted text-text-primary"
                      : "text-text-muted hover:text-text-primary hover:bg-surface-bg"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">{appUser?.name || "Guest"}</span>
            <button
              onClick={signOut}
              className="rounded-lg p-2 text-text-muted hover:bg-surface-bg hover:text-text-primary transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-surface-border bg-white">
          <div className="flex justify-around py-2">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/order" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors",
                    active ? "text-text-primary" : "text-text-muted"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 pb-20 sm:pb-6">
        <Suspense fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-accent" />
          </div>
        }>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
