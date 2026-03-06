"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, demoMode } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !demoMode) {
      router.replace("/login");
    }
  }, [user, loading, demoMode, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-accent" />
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && !demoMode) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1400px] p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
