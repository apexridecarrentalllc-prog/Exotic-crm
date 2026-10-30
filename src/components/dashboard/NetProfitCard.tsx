"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, Wallet } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/invoice-constants";
import type { ProfitLossResult } from "@/lib/reports/profit-loss";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "Net profit this month" card. Only shown to roles that may see financial reports. */
export function NetProfitCard() {
  const { hasRole } = useAuth();
  const allowed = hasRole("ACCOUNTS_MANAGER");
  const now = new Date();
  const start = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const end = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const { data } = useQuery<ProfitLossResult>({
    queryKey: ["profit-loss", start, end, "month"],
    enabled: allowed,
    queryFn: async () => {
      const params = new URLSearchParams({ reportType: "profit_loss", startDate: start, endDate: end, groupBy: "month" });
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error("Failed to load profit");
      return res.json();
    },
    refetchInterval: 60 * 1000,
  });

  if (!allowed || !data) return null;
  const t = data.totals;
  return (
    <Link href="/reports" className="block max-w-sm transition-opacity hover:opacity-90" aria-label="Open Profit and Loss report">
      <StatCard
        title="Net profit this month"
        subtitle={`Revenue ${formatCurrency(t.revenue, "AED")} - Expenses ${formatCurrency(t.expenses, "AED")}`}
        value={formatCurrency(t.netProfit, "AED")}
        icon={t.netProfit < 0 ? TrendingDown : Wallet}
        color={t.netProfit < 0 ? "red" : "green"}
      />
    </Link>
  );
}
