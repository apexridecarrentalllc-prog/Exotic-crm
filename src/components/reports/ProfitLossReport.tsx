"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AlertTriangle, Info, Percent, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { Skeleton } from "@/components/shared/Skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ExportButton } from "@/components/reports/ExportButton";
import { formatCurrency } from "@/lib/invoice-constants";
import { cn } from "@/lib/utils";
import type { ProfitLossResult, ProfitLossGroupBy } from "@/lib/reports/profit-loss";

type Preset = "this_week" | "last_week" | "this_month" | "last_month" | "this_year" | "last_year" | "custom";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "this_week", label: "This week" },
  { id: "last_week", label: "Last week" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "this_year", label: "This year" },
  { id: "last_year", label: "Last year" },
  { id: "custom", label: "Custom" },
];

const GROUP_OPTIONS: { id: ProfitLossGroupBy; label: string }[] = [
  { id: "week", label: "By week" },
  { id: "month", label: "By month" },
  { id: "year", label: "By year" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Start and end day (YYYY-MM-DD) for a preset, using the viewer's calendar. */
function presetRange(preset: Exclude<Preset, "custom">): { start: string; end: string; groupBy: ProfitLossGroupBy } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "this_week":
    case "last_week": {
      const mondayOffset = (now.getDay() + 6) % 7;
      const monday = new Date(y, m, now.getDate() - mondayOffset - (preset === "last_week" ? 7 : 0));
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
      return { start: ymd(monday), end: ymd(sunday), groupBy: "week" };
    }
    case "this_month":
      return { start: ymd(new Date(y, m, 1)), end: ymd(new Date(y, m + 1, 0)), groupBy: "week" };
    case "last_month":
      return { start: ymd(new Date(y, m - 1, 1)), end: ymd(new Date(y, m, 0)), groupBy: "week" };
    case "this_year":
      return { start: `${y}-01-01`, end: `${y}-12-31`, groupBy: "month" };
    case "last_year":
      return { start: `${y - 1}-01-01`, end: `${y - 1}-12-31`, groupBy: "month" };
  }
}

const money = (n: number) => formatCurrency(n, "AED");
const profitColor = (n: number) => (n < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400");

export function ProfitLossReport() {
  const initial = presetRange("this_month");
  const [preset, setPreset] = React.useState<Preset>("this_month");
  const [start, setStart] = React.useState(initial.start);
  const [end, setEnd] = React.useState(initial.end);
  const [groupBy, setGroupBy] = React.useState<ProfitLossGroupBy>(initial.groupBy);

  const choosePreset = (p: Preset) => {
    setPreset(p);
    if (p === "custom") return;
    const r = presetRange(p);
    setStart(r.start);
    setEnd(r.end);
    setGroupBy(r.groupBy);
  };

  const rangeDays = start && end ? (new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / 86_400_000 : 0;
  const rangeTooLong = rangeDays > 3660; // same 10-year limit as the server, so a bad range never reaches it
  const rangeValid = !!start && !!end && start <= end && !rangeTooLong;
  const { data, isLoading, isError, error, isPlaceholderData } = useQuery<ProfitLossResult>({
    queryKey: ["profit-loss", start, end, groupBy],
    enabled: rangeValid,
    queryFn: async () => {
      const params = new URLSearchParams({ reportType: "profit_loss", startDate: start, endDate: end, groupBy });
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message ?? "Failed to load report");
      }
      // An expired session can answer with a web page instead of data; say that in plain words.
      return res.json().catch(() => {
        throw new Error("Could not load the report. Your session may have expired - refresh the page and sign in again.");
      });
    },
    placeholderData: (prev) => prev,
    // A failed request is shown straight away; retrying would only keep old figures on screen for seconds.
    retry: false,
  });

  const t = data?.totals;
  const historyWarning = data
    ? data.expensesSince === null
      ? "No expenses have been recorded yet, so profit currently equals revenue."
      : data.period.start < data.expensesSince
        ? `Expenses are only recorded from ${data.expensesSince}. Profit for dates before that is overstated.`
        : null
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => choosePreset(p.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  preset === p.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              From
              <Input
                type="date"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  setPreset("custom");
                }}
                className="h-10 w-40"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              To
              <Input
                type="date"
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value);
                  setPreset("custom");
                }}
                className="h-10 w-40"
              />
            </label>
            <div className="flex overflow-hidden rounded-md border">
              {GROUP_OPTIONS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGroupBy(g.id)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium transition-colors",
                    groupBy === g.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <ExportButton
              reportType="profit_loss"
              startDate={start}
              endDate={end}
              companyId=""
              groupBy={groupBy}
              disabled={!rangeValid}
              onError={(msg) => toast.error(msg)}
            />
          </div>
          {rangeTooLong ? (
            <p className="text-sm text-destructive">The date range is too long (maximum 10 years).</p>
          ) : (
            !rangeValid && <p className="text-sm text-destructive">Choose a start date that is not after the end date.</p>
          )}
        </CardContent>
      </Card>

      {!rangeValid ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Fix the date range above to see the report.
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/40 p-6 text-center text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load report"}
        </div>
      ) : isLoading || !data || !t ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className={cn("space-y-6 transition-opacity", isPlaceholderData && "opacity-50")}>
          {historyWarning && (
            <div className="flex items-start gap-2 rounded-md border border-amber-400/50 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {historyWarning}{" "}
                <Link href="/expenses" className="font-medium underline">
                  Add expenses
                </Link>
              </span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard title="Revenue" subtitle={`${t.invoiceCount} invoice(s), before tax`} value={money(t.revenue)} icon={TrendingUp} color="blue" />
            <StatCard title="Expenses" subtitle={`${t.expenseCount} expense(s)`} value={money(t.expenses)} icon={Receipt} color="yellow" />
            <StatCard
              title="Net profit"
              subtitle="Revenue minus expenses"
              value={money(t.netProfit)}
              icon={t.netProfit < 0 ? TrendingDown : Wallet}
              color={t.netProfit < 0 ? "red" : "green"}
            />
            <StatCard
              title="Profit margin"
              subtitle="Net profit / revenue"
              value={t.marginPercent === null ? "—" : `${t.marginPercent.toFixed(1)}%`}
              icon={Percent}
              color="purple"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cash view</CardTitle>
              <p className="text-sm text-muted-foreground">
                Money actually received and paid out in the period (regardless of when invoices were issued).
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Cash received</p>
                <p className="text-xl font-semibold tabular-nums">{money(t.cashReceived)}</p>
                {t.advanceReceived > 0 && (
                  <p className="text-xs text-muted-foreground">includes {money(t.advanceReceived)} advance deposits</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cash paid out (expenses)</p>
                <p className="text-xl font-semibold tabular-nums">{money(t.cashPaid)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net cash</p>
                <p className={cn("text-xl font-semibold tabular-nums", profitColor(t.netCash))}>{money(t.netCash)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profit by {groupBy}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2 font-medium">Period</th>
                    <th className="p-2 text-right font-medium">Revenue</th>
                    <th className="p-2 text-right font-medium">Expenses</th>
                    <th className="p-2 text-right font-medium">Net profit</th>
                    <th className="p-2 text-right font-medium">Cash received</th>
                    <th className="p-2 text-right font-medium">Net cash</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.key} className="border-b">
                      <td className="p-2 whitespace-nowrap">{r.label}</td>
                      <td className="p-2 text-right whitespace-nowrap tabular-nums">{money(r.revenue)}</td>
                      <td className="p-2 text-right whitespace-nowrap tabular-nums">{money(r.expenses)}</td>
                      <td className={cn("p-2 text-right whitespace-nowrap font-medium tabular-nums", profitColor(r.netProfit))}>{money(r.netProfit)}</td>
                      <td className="p-2 text-right whitespace-nowrap tabular-nums">{money(r.cashReceived)}</td>
                      <td className={cn("p-2 text-right whitespace-nowrap tabular-nums", profitColor(r.netCash))}>{money(r.netCash)}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/40 font-semibold">
                    <td className="p-2">Total</td>
                    <td className="p-2 text-right whitespace-nowrap tabular-nums">{money(t.revenue)}</td>
                    <td className="p-2 text-right whitespace-nowrap tabular-nums">{money(t.expenses)}</td>
                    <td className={cn("p-2 text-right whitespace-nowrap tabular-nums", profitColor(t.netProfit))}>{money(t.netProfit)}</td>
                    <td className="p-2 text-right whitespace-nowrap tabular-nums">{money(t.cashReceived)}</td>
                    <td className={cn("p-2 text-right whitespace-nowrap tabular-nums", profitColor(t.netCash))}>{money(t.netCash)}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expenses by category</CardTitle>
              </CardHeader>
              <CardContent>
                {data.byCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No expenses in this period.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.byCategory.map((c) => (
                      <li key={c.category} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span>
                            {c.category} <span className="text-muted-foreground">({c.count})</span>
                          </span>
                          <span className="tabular-nums font-medium">
                            {money(c.amount)} <span className="text-xs text-muted-foreground">{c.sharePercent.toFixed(1)}%</span>
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded bg-muted">
                          <div className="h-full bg-primary" style={{ width: `${Math.min(100, c.sharePercent)}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profit by shipment</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {data.byShipment.length === 0 && data.overheadExpenses === 0 ? (
                  <p className="text-sm text-muted-foreground">No shipment activity in this period.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="p-2 font-medium">Shipment</th>
                        <th className="p-2 text-right font-medium">Revenue</th>
                        <th className="p-2 text-right font-medium">Expenses</th>
                        <th className="p-2 text-right font-medium">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byShipment.map((s) => (
                        <tr key={s.shipmentId} className="border-b">
                          <td className="p-2">
                            <Link href={`/shipments/${s.shipmentId}`} className="text-primary hover:underline">
                              {s.shipmentRef}
                            </Link>
                          </td>
                          <td className="p-2 text-right whitespace-nowrap tabular-nums">{money(s.revenue)}</td>
                          <td className="p-2 text-right whitespace-nowrap tabular-nums">{money(s.expenses)}</td>
                          <td className={cn("p-2 text-right whitespace-nowrap font-medium tabular-nums", profitColor(s.profit))}>{money(s.profit)}</td>
                        </tr>
                      ))}
                      {data.overheadExpenses > 0 && (
                        <tr className="border-b">
                          <td className="p-2 text-muted-foreground">Overhead (no shipment)</td>
                          <td className="p-2 text-right whitespace-nowrap tabular-nums">{money(0)}</td>
                          <td className="p-2 text-right whitespace-nowrap tabular-nums">{money(data.overheadExpenses)}</td>
                          <td className={cn("p-2 text-right whitespace-nowrap font-medium tabular-nums", profitColor(-data.overheadExpenses))}>
                            {money(-data.overheadExpenses)}
                          </td>
                        </tr>
                      )}
                      <tr className="bg-muted/40 font-semibold">
                        <td className="p-2">Net profit</td>
                        <td className="p-2 text-right whitespace-nowrap tabular-nums">{money(t.revenue)}</td>
                        <td className="p-2 text-right whitespace-nowrap tabular-nums">{money(t.expenses)}</td>
                        <td className={cn("p-2 text-right whitespace-nowrap tabular-nums", profitColor(t.netProfit))}>{money(t.netProfit)}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <strong>Revenue</strong> is the invoices issued in the period (not draft, not cancelled), before tax. Payments are never added to revenue, so nothing is counted twice.{" "}
              <strong>Expenses</strong> are the costs recorded on the Expenses page. Advance deposits count as cash received but not as revenue until they are invoiced. Credit notes are not deducted. Amounts are in AED.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
