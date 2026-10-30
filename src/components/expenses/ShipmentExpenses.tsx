"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/shared/StatCard";
import { ExpenseDialog, type ExpenseRow, type ExpenseSubmit } from "@/components/expenses/ExpenseDialog";
import { formatCurrency } from "@/lib/invoice-constants";
import { Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";

type Profit = { revenue: number; expenses: number; profit: number; invoiceCount: number; expenseCount: number };

/** "Expenses & Profit" tab of a shipment: what it earned, what it cost, and the expenses behind that. */
export function ShipmentExpenses({ shipmentId, referenceNumber }: { shipmentId: string; referenceNumber: string }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const profitQuery = useQuery<Profit>({
    queryKey: ["shipment-expenses", shipmentId, "profit"],
    queryFn: async () => {
      const res = await fetch(`/api/shipments/${shipmentId}/profit`);
      if (!res.ok) throw new Error("Failed to load profit");
      return res.json();
    },
  });
  const listQuery = useQuery<{ data: ExpenseRow[] }>({
    queryKey: ["shipment-expenses", shipmentId, "list"],
    queryFn: async () => {
      const res = await fetch(`/api/expenses?shipmentId=${shipmentId}&limit=100`);
      if (!res.ok) throw new Error("Failed to load expenses");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (input: ExpenseSubmit) => {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || "Failed to add expense");
      }
    },
    onSuccess: () => {
      toast.success("Expense added");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["shipment-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["profit-loss"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const p = profitQuery.data;
  const rows = listQuery.data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Revenue" subtitle={p ? `${p.invoiceCount} invoice(s), before tax` : undefined} value={formatCurrency(p?.revenue ?? 0, "AED")} icon={TrendingUp} color="blue" />
        <StatCard title="Expenses" subtitle={p ? `${p.expenseCount} expense(s)` : undefined} value={formatCurrency(p?.expenses ?? 0, "AED")} icon={Receipt} color="yellow" />
        <StatCard
          title="Profit"
          subtitle="Revenue minus expenses"
          value={formatCurrency(p?.profit ?? 0, "AED")}
          icon={(p?.profit ?? 0) < 0 ? TrendingDown : Wallet}
          color={(p?.profit ?? 0) < 0 ? "red" : "green"}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Expenses for this shipment</CardTitle>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Add expense
          </Button>
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses recorded for this shipment yet.</p>
          ) : (
            <ul className="divide-y">
              {rows.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(parseISO(r.expenseDate), "dd MMM yyyy")}</span>
                      <Badge variant="outline">{r.category}</Badge>
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{r.expenseNumber}</span>
                    </div>
                    <p className="text-sm">{r.description}</p>
                    {r.vendor && <p className="text-xs text-muted-foreground">{r.vendor}</p>}
                  </div>
                  <span className="whitespace-nowrap font-semibold tabular-nums">{formatCurrency(r.amount, "AED")}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            To edit or delete an expense, use the{" "}
            <Link href="/expenses" className="text-primary hover:underline">
              Expenses page
            </Link>
            . Company overhead (rent, salaries) is not included here.
          </p>
        </CardContent>
      </Card>

      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        presetShipment={{ id: shipmentId, referenceNumber }}
        onSubmit={(input) => addMutation.mutate(input)}
        isLoading={addMutation.isPending}
      />
    </div>
  );
}
