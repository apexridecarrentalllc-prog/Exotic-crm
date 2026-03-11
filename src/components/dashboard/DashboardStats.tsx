"use client";

import { Package, FileText, CheckCircle, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { cn } from "@/lib/utils";

export interface DashboardStatsData {
  activeShipments: number;
  totalInvoicedThisMonth: number;
  totalCollectedThisMonth: number;
  totalOutstanding: number;
  overdueInvoices: number;
  shipmentsThisMonth: number;
}

const formatter = new Intl.NumberFormat("en-PK", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function DashboardStats({
  stats,
  loading,
}: {
  stats: DashboardStatsData | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-xl border bg-card p-6 shadow-sm",
              "animate-pulse"
            )}
          >
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="mt-2 h-8 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard
        title="Active Shipments"
        value={formatter.format(stats.activeShipments)}
        icon={Package}
        color="blue"
      />
      <StatCard
        title="Invoiced This Month"
        value={formatter.format(stats.totalInvoicedThisMonth)}
        icon={FileText}
        color="purple"
      />
      <StatCard
        title="Collected This Month"
        value={formatter.format(stats.totalCollectedThisMonth)}
        icon={CheckCircle}
        color="green"
      />
      <StatCard
        title="Outstanding"
        value={formatter.format(stats.totalOutstanding)}
        icon={Clock}
        color="yellow"
      />
      <StatCard
        title="Overdue Invoices"
        value={formatter.format(stats.overdueInvoices)}
        icon={AlertTriangle}
        color="red"
      />
      <StatCard
        title="Shipments This Month"
        value={formatter.format(stats.shipmentsThisMonth)}
        icon={TrendingUp}
        color="purple"
      />
    </div>
  );
}
