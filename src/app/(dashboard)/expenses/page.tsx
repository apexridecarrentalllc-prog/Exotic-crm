"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { format, parseISO } from "date-fns";
import { AlertCircle, Loader2, Pencil, Plus, Receipt, Search, Trash2, Wallet, X } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/shared/Skeleton";
import { Pagination } from "@/components/shared/Pagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ExpenseDialog, type ExpenseRow, type ExpenseSubmit } from "@/components/expenses/ExpenseDialog";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/invoice-constants";
import { EXPENSE_CATEGORIES, EXPENSE_METHODS, EXPENSE_METHOD_LABELS } from "@/lib/expense-categories";

const SELECT_CLASS =
  "h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

type ExpensesResponse = {
  data: ExpenseRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  summary: { totalAmount: number; count: number };
};

async function errorMessage(res: Response, fallback: string) {
  const j = await res.json().catch(() => ({}));
  return j.message || fallback;
}

function ExpensesContent() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const canDelete = hasRole("ADMIN");

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [method, setMethod] = React.useState("");
  const [shipmentFilter, setShipmentFilter] = React.useState(""); // "" = all, "none" = overhead only
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ExpenseRow | null>(null);
  const [toDelete, setToDelete] = React.useState<ExpenseRow | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const filtersActive = !!(search || category || method || shipmentFilter || from || to);
  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setMethod("");
    setShipmentFilter("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (category) params.set("category", category);
  if (method) params.set("method", method);
  if (shipmentFilter) params.set("shipmentId", shipmentFilter);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const { data, isLoading, isError, error, isPlaceholderData, refetch } = useQuery<ExpensesResponse>({
    queryKey: ["expenses", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/expenses?${params}`);
      if (!res.ok) throw new Error(await errorMessage(res, "Failed to load expenses"));
      // An expired session can answer with a web page instead of data; say that in plain words.
      return res.json().catch(() => {
        throw new Error("Could not load expenses. Your session may have expired - refresh the page and sign in again.");
      });
    },
    placeholderData: (prev) => prev,
    // A failed request is shown straight away; retrying would only keep old figures on screen for seconds.
    retry: false,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["profit-loss"] });
    queryClient.invalidateQueries({ queryKey: ["shipment-expenses"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (input: ExpenseSubmit) => {
      const res = await fetch(editing ? `/api/expenses/${editing.id}` : "/api/expenses", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await errorMessage(res, "Failed to save expense"));
      return res.json();
    },
    onSuccess: () => {
      toast.success(editing ? "Expense updated" : "Expense added");
      setDialogOpen(false);
      setEditing(null);
      refreshAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await errorMessage(res, "Failed to delete expense"));
    },
    onSuccess: () => {
      toast.success("Expense deleted");
      refreshAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data?.data ?? [];
  const noExpensesAtAll = !isLoading && !isError && !filtersActive && (data?.pagination.total ?? 0) === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Money your business spends. Expenses are used to calculate profit in Reports → Profit & Loss."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add expense
          </Button>
        }
      />

      {/* No totals while the list failed to load: zeros would look like a real answer. Old totals are dimmed while loading. */}
      {!isError && (
        <div className={`grid gap-4 sm:grid-cols-2 transition-opacity ${isPlaceholderData ? "opacity-50" : ""}`}>
          <StatCard
            title={filtersActive ? "Total (filtered)" : "Total expenses"}
            value={formatCurrency(data?.summary.totalAmount ?? 0, "AED")}
            icon={Wallet}
            color="red"
          />
          <StatCard title="Entries" value={data?.summary.count ?? 0} icon={Receipt} color="blue" />
        </div>
      )}

      {noExpensesAtAll ? (
        <EmptyState
          icon={Receipt}
          title="No expenses recorded yet"
          description="Add costs such as freight, customs fees, rent and salaries to see your real profit."
          actionLabel="Add expense"
          onAction={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        />
      ) : (
        <>
          <Card>
            <CardContent className="space-y-3 pt-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative w-full lg:flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search description, vendor, number or shipment"
                    className="h-10 pl-9"
                    aria-label="Search expenses"
                  />
                </div>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter by category"
                  className={`${SELECT_CLASS} lg:w-52`}
                >
                  <option value="">All categories</option>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={shipmentFilter}
                  onChange={(e) => {
                    setShipmentFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter by shipment"
                  className={`${SELECT_CLASS} lg:w-48`}
                >
                  <option value="">All expenses</option>
                  <option value="none">Company overhead only</option>
                </select>
                <select
                  value={method}
                  onChange={(e) => {
                    setMethod(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter by payment method"
                  className={`${SELECT_CLASS} lg:w-40`}
                >
                  <option value="">Any method</option>
                  {EXPENSE_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {EXPENSE_METHOD_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  From
                  <Input
                    type="date"
                    value={from}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      setPage(1);
                    }}
                    className="h-10 w-40"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  To
                  <Input
                    type="date"
                    value={to}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setPage(1);
                    }}
                    className="h-10 w-40"
                  />
                </label>
                {filtersActive && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4" /> Clear filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {isError ? (
            <div className="space-y-3 rounded-lg border border-destructive/40 p-6 text-center text-sm text-destructive">
              <p>{error instanceof Error ? error.message : "Failed to load expenses"}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No expenses match your filters.
            </div>
          ) : (
            <div className={`rounded-md border transition-opacity ${isPlaceholderData ? "opacity-50" : ""}`}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Shipment</TableHead>
                    <TableHead>Paid by</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{format(parseISO(r.expenseDate), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{r.expenseNumber}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="line-clamp-2">{r.description}</p>
                        {r.vendor && <p className="text-xs text-muted-foreground">{r.vendor}</p>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {r.shipmentId && r.shipmentRef ? (
                          <Link href={`/shipments/${r.shipmentId}`} className="text-primary hover:underline">
                            {r.shipmentRef}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Overhead</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {EXPENSE_METHOD_LABELS[r.method as keyof typeof EXPENSE_METHOD_LABELS] ?? r.method}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">
                        {formatCurrency(r.amount, "AED")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setEditing(r);
                              setDialogOpen(true);
                            }}
                            aria-label={`Edit expense ${r.expenseNumber}`}
                            title="Edit"
                          >
                            <Pencil />
                          </Button>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setToDelete(r)}
                              className="text-destructive hover:text-destructive"
                              aria-label={`Delete expense ${r.expenseNumber}`}
                              title="Delete"
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {data && (
            <Pagination
              pagination={data.pagination}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </>
      )}

      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        initial={editing}
        onSubmit={(input) => saveMutation.mutate(input)}
        isLoading={saveMutation.isPending}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete expense?"
        description={
          toDelete
            ? `${toDelete.expenseNumber} (${formatCurrency(toDelete.amount, "AED")}, ${toDelete.category}) will be permanently deleted and your profit figures will change. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        onConfirm={async () => {
          if (toDelete) await deleteMutation.mutateAsync(toDelete.id).catch(() => undefined);
        }}
      />
    </div>
  );
}

export default function ExpensesPage() {
  const { user, hasRole } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Same roles as the Expenses API (Super Admin, Admin, Accounts Manager).
  if (!hasRole("ACCOUNTS_MANAGER")) {
    return (
      <div className="space-y-6">
        <PageHeader title="Expenses" />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
            <p className="text-center text-muted-foreground">
              You do not have permission to view expenses. Contact an administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ExpensesContent />;
}
