"use client";

import { useQuery } from "@tanstack/react-query";
import type { DashboardApiResponse } from "@/types";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ShipmentStatusChart } from "@/components/dashboard/ShipmentStatusChart";
import { RecentShipments } from "@/components/dashboard/RecentShipments";
import { OverdueInvoices } from "@/components/dashboard/OverdueInvoices";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { TopCompaniesChart } from "@/components/dashboard/TopCompaniesChart";
import { AlertTriangle } from "lucide-react";

async function fetchDashboard(): Promise<DashboardApiResponse> {
  const res = await fetch("/api/dashboard");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to load dashboard");
  }
  return res.json();
}

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 30 * 1000,
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">Failed to load dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {error instanceof Error ? error.message : "Something went wrong"}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data && (
        <AlertsPanel
          overdueCount={data.stats.overdueInvoices}
          pendingDocumentsCount={data.stats.pendingDocuments}
        />
      )}

      <section>
        <h2 className="text-lg font-semibold mb-4">Overview</h2>
        <DashboardStats
          stats={data?.stats ?? null}
          loading={isLoading}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr] xl:grid-cols-[6fr_4fr]">
        <RevenueChart data={data?.monthlyRevenue ?? []} loading={isLoading} />
        <ShipmentStatusChart data={data?.shipmentsByStatus ?? []} loading={isLoading} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <RecentShipments data={data?.recentShipments ?? []} loading={isLoading} />
        <OverdueInvoices data={data?.overdueInvoicesList ?? []} loading={isLoading} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <TopCompaniesChart data={data?.topCompaniesByRevenue ?? []} loading={isLoading} />
        <QuickActions />
      </section>
    </div>
  );
}
