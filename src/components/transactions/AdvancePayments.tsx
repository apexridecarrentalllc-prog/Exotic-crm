"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { Building2, Pencil, Plus, Receipt, Search, Trash2, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/invoice-constants";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/shared/Skeleton";
import { StatCard } from "@/components/shared/StatCard";
import { Pagination } from "@/components/shared/Pagination";

export interface AdvancePaymentRow {
  id: string;
  companyId: string;
  companyName: string;
  amount: number;
  currency: string;
  paymentDate: string;
  method: string;
  referenceNumber: string | null;
  notes?: string | null;
}

export interface AdvancePaymentsProps {
  payments: AdvancePaymentRow[];
  loading?: boolean;
  onRecordAdvance?: () => void;
  onEdit?: (payment: AdvancePaymentRow) => void;
  /** Omit to hide the delete action (e.g. for roles that cannot delete). */
  onDelete?: (payment: AdvancePaymentRow) => void;
}

const ALL_COMPANIES = "all";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function AdvancePayments({
  payments,
  loading,
  onRecordAdvance,
  onEdit,
  onDelete,
}: AdvancePaymentsProps) {
  const [search, setSearch] = React.useState("");
  const [companyFilter, setCompanyFilter] = React.useState(ALL_COMPANIES);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Companies that have at least one advance, A-Z, for the filter dropdown.
  const companyOptions = React.useMemo(() => {
    const byId = new Map<string, string>();
    for (const p of payments) byId.set(p.companyId, p.companyName);
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [payments]);

  // Fall back to "All" if the selected company no longer has any advances (e.g. after a delete).
  const activeCompany = companyOptions.some((c) => c.id === companyFilter)
    ? companyFilter
    : ALL_COMPANIES;

  const byCompany = React.useMemo(
    () => (activeCompany === ALL_COMPANIES ? payments : payments.filter((p) => p.companyId === activeCompany)),
    [payments, activeCompany]
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return byCompany;
    return byCompany.filter((p) =>
      [p.companyName, p.referenceNumber, p.notes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [byCompany, search]);

  // Pagination runs over the filtered list; keep the page valid when the list shrinks (filter, delete).
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = React.useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  // Summary cards follow the company filter.
  const total = byCompany.reduce((sum, p) => sum + p.amount, 0);
  const companyCount = new Set(byCompany.map((p) => p.companyId)).size;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No advance payments yet"
        description="Record money received from a company before an invoice is issued."
        actionLabel={onRecordAdvance ? "Record advance payment" : undefined}
        onAction={onRecordAdvance}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total advances" value={formatCurrency(total, "AED")} icon={Wallet} color="green" />
        <StatCard title="Payments recorded" value={byCompany.length} icon={Receipt} color="blue" />
        <StatCard title="Companies" value={companyCount} icon={Building2} color="purple" />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative w-full md:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search company, reference or description"
            className="h-10 pl-9"
            aria-label="Search advance payments"
          />
        </div>
        <select
          value={activeCompany}
          onChange={(e) => {
            setCompanyFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by company"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 md:w-64"
        >
          <option value={ALL_COMPANIES}>All companies</option>
          {companyOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {onRecordAdvance && (
          <Button className="h-10 shrink-0" onClick={onRecordAdvance}>
            <Plus className="h-4 w-4" /> Record advance payment
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No advance payments match your filters.
        </div>
      ) : (
        <ul className="space-y-3">
          {pageRows.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initials(p.companyName)}
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium">{p.companyName}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{format(parseISO(p.paymentDate), "dd MMM yyyy")}</span>
                    <Badge variant="outline">Cash</Badge>
                    {p.referenceNumber && (
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{p.referenceNumber}</span>
                    )}
                  </div>
                  {p.notes && <p className="line-clamp-2 text-sm text-muted-foreground">{p.notes}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(p.amount, "AED")}
                </span>
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(p)}
                      aria-label={`Edit advance payment ${p.referenceNumber ?? ""}`}
                      title="Edit"
                    >
                      <Pencil />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onDelete(p)}
                      className="text-destructive hover:text-destructive"
                      aria-label={`Delete advance payment ${p.referenceNumber ?? ""}`}
                      title="Delete"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        pagination={{ page: currentPage, pageSize, total: filtered.length, totalPages }}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
