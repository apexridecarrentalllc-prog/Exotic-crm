"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { formatAmount } from "@/lib/invoice-constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown";
import { Plus, MoreHorizontal, Eye, FileDown, Send, CreditCard, X, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  status: string;
  companyName: string;
  shipmentReference: string;
  issueDate: string;
  dueDate: string;
  totalAmount?: number;
  paidAmount?: number;
  balanceAmount?: number;
  currency: string;
  isOverdue: boolean;
};

type ApiResponse = {
  data: InvoiceRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type StatsResponse = {
  totalInvoices: number;
  draftCount: number;
  sentCount: number;
  overdueCount: number;
  paidThisMonth: number;
  outstandingTotal: number;
};

async function fetchInvoices(params: {
  search?: string;
  status?: string;
  companyId?: string;
  startDate?: string;
  endDate?: string;
  overdueOnly?: boolean;
  page: number;
  limit: number;
}): Promise<ApiResponse> {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.status) sp.set("status", params.status);
  if (params.companyId) sp.set("companyId", params.companyId);
  if (params.startDate) sp.set("startDate", params.startDate);
  if (params.endDate) sp.set("endDate", params.endDate);
  if (params.overdueOnly) sp.set("overdueOnly", "true");
  sp.set("page", String(params.page));
  sp.set("limit", String(params.limit));
  const res = await fetch(`/api/invoices?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch invoices");
  return res.json();
}

async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch("/api/invoices/stats");
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

async function fetchCompanies(): Promise<{ data: { id: string; name: string }[] }> {
  const res = await fetch("/api/companies?limit=100");
  if (!res.ok) throw new Error("Failed to fetch companies");
  return res.json();
}

const EDITABLE_STATUSES = ["DRAFT", "SENT", "PARTIALLY_PAID", "OVERDUE"];

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceRow | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", search, status, companyId, startDate, endDate, overdueOnly, page, limit],
    queryFn: () =>
      fetchInvoices({
        search: search || undefined,
        status: status || undefined,
        companyId: companyId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        overdueOnly,
        page,
        limit,
      }),
  });

  const { data: stats } = useQuery({ queryKey: ["invoices-stats"], queryFn: fetchStats });
  const { data: companiesData } = useQuery({ queryKey: ["companies-list"], queryFn: fetchCompanies });

  const deleteMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Failed to delete invoice");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-stats"] });
      toast.success("Invoice deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatus("");
    setCompanyId("");
    setStartDate("");
    setEndDate("");
    setOverdueOnly(false);
    setPage(1);
  }, []);

  const hasFilters = search || status || companyId || startDate || endDate || overdueOnly;

  const columns: DataTableColumn<InvoiceRow>[] = [
    {
      id: "invoiceNumber",
      header: "Invoice #",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Link href={`/invoices/${row.id}`} className="font-semibold hover:underline">
            {row.invoiceNumber}
          </Link>
          <InvoiceStatusBadge status={row.status} />
        </div>
      ),
    },
    { id: "companyName", header: "Company", cell: (row) => row.companyName },
    { id: "shipmentReference", header: "Shipment", cell: (row) => row.shipmentReference },
    {
      id: "issueDate",
      header: "Issue Date",
      cell: (row) => new Date(row.issueDate).toLocaleDateString(),
    },
    {
      id: "totalAmount",
      header: "Total (AED)",
      cell: (row) =>
        row.totalAmount != null ? (
          <span className="tabular-nums">{formatAmount(row.totalAmount)}</span>
        ) : (
          "—"
        ),
    },
    {
      id: "paidAmount",
      header: "Paid (AED)",
      cell: (row) =>
        row.paidAmount != null ? (
          <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatAmount(row.paidAmount)}
          </span>
        ) : (
          "—"
        ),
    },
    {
      id: "balanceAmount",
      header: "Balance (AED)",
      cell: (row) => {
        const bal = row.balanceAmount ?? 0;
        return (
          <span
            className={cn(
              "tabular-nums font-medium",
              bal > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {row.balanceAmount != null ? (
              bal === 0 ? "✓ 0" : formatAmount(bal)
            ) : (
              "—"
            )}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Link href={`/invoices/${row.id}`}>
            <Button variant="ghost" size="icon-sm" aria-label="View">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <a href={`/api/invoices/${row.id}/pdf`} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon-sm" aria-label="Download PDF">
              <FileDown className="h-4 w-4" />
            </Button>
          </a>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {EDITABLE_STATUSES.includes(row.status) && hasRole("ACCOUNTS_MANAGER") && (
                <DropdownMenuItem asChild>
                  <Link href={`/invoices/${row.id}/edit`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </DropdownMenuItem>
              )}
              {row.status === "DRAFT" && (
                <DropdownMenuItem asChild>
                  <Link href={`/invoices/${row.id}`}>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Link>
                </DropdownMenuItem>
              )}
              {(row.status === "SENT" || row.status === "PARTIALLY_PAID" || row.status === "OVERDUE") && (
                <DropdownMenuItem asChild>
                  <Link href={`/invoices/${row.id}`}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Record Payment
                  </Link>
                </DropdownMenuItem>
              )}
              {row.status !== "PAID" && row.status !== "CANCELLED" && (
                <DropdownMenuItem asChild>
                  <Link href={`/invoices/${row.id}?cancel=1`}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Link>
                </DropdownMenuItem>
              )}
              {hasRole("ADMIN") && (row.paidAmount ?? 0) === 0 && (
                <DropdownMenuItem
                  onSelect={() => setInvoiceToDelete(row)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        actions={
          <Link href="/invoices/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Invoices</p>
          <p className="text-2xl font-semibold">{stats?.totalInvoices ?? "—"}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Draft</p>
          <p className="text-2xl font-semibold">{stats?.draftCount ?? "—"}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Sent</p>
          <p className="text-2xl font-semibold">{stats?.sentCount ?? "—"}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className={cn("text-2xl font-semibold", (stats?.overdueCount ?? 0) > 0 && "text-destructive")}>
            {stats?.overdueCount ?? "—"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Paid This Month</p>
          <p className="text-2xl font-semibold">{stats?.paidThisMonth != null ? `AED ${formatAmount(stats.paidThisMonth)}` : "—"}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Outstanding Total</p>
          <p className="text-2xl font-semibold">{stats?.outstandingTotal != null ? `AED ${formatAmount(stats.outstandingTotal)}` : "—"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
        <Input
          placeholder="Search (invoice #, company)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-[200px]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm w-[130px]"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Paid</option>
          <option value="OVERDUE">Overdue</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm w-[160px]"
        >
          <option value="">All companies</option>
          {(companiesData?.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 w-[130px]" />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 w-[130px]" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="rounded border-input" />
          Overdue only
        </label>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <DataTable<InvoiceRow>
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        pagination={
          data
            ? { page: data.page, pageSize: data.limit, total: data.total, totalPages: data.totalPages }
            : undefined
        }
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
        getRowId={(row) => row.id}
        emptyMessage="No invoices found"
      />

      <ConfirmDialog
        open={invoiceToDelete !== null}
        onOpenChange={(open) => !open && setInvoiceToDelete(null)}
        title="Delete invoice?"
        description={
          invoiceToDelete
            ? `${invoiceToDelete.invoiceNumber} for ${invoiceToDelete.companyName} will be permanently deleted. Its number will not be reused. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        onConfirm={async () => {
          if (invoiceToDelete) await deleteMutation.mutateAsync(invoiceToDelete.id).catch(() => undefined);
        }}
      />
    </div>
  );
}
