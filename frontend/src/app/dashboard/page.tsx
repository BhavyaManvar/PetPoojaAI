"use client";

import { useKPI } from "@/hooks/useKPI";
import { KPICard } from "@/components/cards/kpi-card";
import { RevenueBarChart, RevenuePieChart } from "@/components/charts/revenue-chart";
import { DataTable } from "@/components/tables/data-table";
import { formatCurrency, formatNumber } from "@/utils/helpers";
import { IndianRupee, ShoppingCart, TrendingUp, Utensils } from "lucide-react";

export default function DashboardPage() {
  const { data, isLoading, error } = useKPI();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-[var(--muted-foreground)]">Loading dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-red-500">Failed to load KPI data. Is the backend running?</p>
      </div>
    );
  }

  const cityData = Object.entries(data.revenue_by_city ?? {}).map(([name, value]) => ({
    name,
    value: value as number,
  }));

  const orderTypeData = Object.entries(data.revenue_by_order_type ?? {}).map(
    ([name, value]) => ({ name, value: value as number })
  );

  const topItemColumns = [
    { key: "item_name" as const, header: "Item" },
    { key: "total_qty" as const, header: "Qty Sold", className: "text-right" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(data.total_revenue)}
          icon={<IndianRupee size={20} />}
        />
        <KPICard
          title="Total Orders"
          value={formatNumber(data.total_orders)}
          icon={<ShoppingCart size={20} />}
        />
        <KPICard
          title="Avg Order Value"
          value={formatCurrency(data.avg_order_value)}
          icon={<TrendingUp size={20} />}
        />
        <KPICard
          title="Unique Items"
          value={formatNumber(data.unique_items)}
          icon={<Utensils size={20} />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueBarChart
          data={cityData}
          xKey="name"
          yKey="value"
          title="Revenue by City"
        />
        <RevenuePieChart data={orderTypeData} title="Revenue by Order Type" />
      </div>

      {/* Top Items Table */}
      <DataTable
        title="Top 5 Items by Quantity"
        columns={topItemColumns}
        data={(data.top_items ?? []) as Record<string, unknown>[]}
        emptyMessage="No item data"
      />
    </div>
  );
}
