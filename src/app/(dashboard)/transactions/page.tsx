"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { LedgerTable } from "@/components/transactions/LedgerTable";
import { AgingReport } from "@/components/transactions/AgingReport";
import { AgingChart } from "@/components/transactions/AgingChart";
import { AdvancePayments, type AdvancePaymentRow } from "@/components/transactions/AdvancePayments";
import { AdvancePaymentDialog, type AdvancePaymentSubmit } from "@/components/transactions/AdvancePaymentDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { StatementGenerator } from "@/components/transactions/StatementGenerator";
import { formatCurrency } from "@/lib/invoice-constants";
import { DownloadExportButton } from "@/components/shared/DownloadExportButton";

async function fetchTransactions(params: {
  companyId?: string;
  shipmentId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  if (params.companyId) sp.set("companyId", params.companyId);
  if (params.shipmentId) sp.set("shipmentId", params.shipmentId);
  if (params.type) sp.set("type", params.type);
  if (params.startDate) sp.set("startDate", params.startDate);
  if (params.endDate) sp.set("endDate", params.endDate);
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  const res = await fetch(`/api/transactions?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
}

async function fetchAging() {
  const res = await fetch("/api/transactions/aging");
  if (!res.ok) throw new Error("Failed to fetch aging");
  return res.json();
}

async function fetchAdvancePayments() {
  const res = await fetch("/api/transactions/advance");
  if (!res.ok) throw new Error("Failed to fetch advance payments");
  return res.json();
}

async function fetchCompanies() {
  const res = await fetch("/api/companies?limit=200");
  if (!res.ok) throw new Error("Failed to fetch companies");
  return res.json();
}

async function fetchCompanyDetail(id: string) {
  const res = await fetch(`/api/companies/${id}`);
  if (!res.ok) throw new Error("Failed to fetch company");
  return res.json();
}

async function sendJson<T>(url: string, method: string, body: unknown, fallback: string): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || fallback);
  }
  return res.json();
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  // "create" opens the blank form; a row opens the edit form for that advance.
  const [advanceDialog, setAdvanceDialog] = React.useState<"create" | AdvancePaymentRow | null>(null);
  const [advanceToDelete, setAdvanceToDelete] = React.useState<AdvancePaymentRow | null>(null);
  const editingAdvance = advanceDialog && advanceDialog !== "create" ? advanceDialog : null;
  const [activeTab, setActiveTab] = React.useState("ledger");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [companyFilter, setCompanyFilter] = React.useState("");
  const [companyLedgerId, setCompanyLedgerId] = React.useState("");
  const [page, setPage] = React.useState(1);
  const limit = 20;

  const ledgerCompanyId = activeTab === "company" ? companyLedgerId : companyFilter;
  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ["transactions", ledgerCompanyId, startDate, endDate, page, limit],
    queryFn: () =>
      fetchTransactions({
        companyId: ledgerCompanyId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
      }),
    enabled: activeTab === "ledger" || (activeTab === "company" && !!companyLedgerId),
  });

  const { data: agingData, isLoading: agingLoading } = useQuery({
    queryKey: ["transactions-aging"],
    queryFn: fetchAging,
    enabled: activeTab === "aging",
  });

  const { data: advanceData, isLoading: advanceLoading } = useQuery({
    queryKey: ["transactions-advance"],
    queryFn: fetchAdvancePayments,
    enabled: activeTab === "advance",
  });

  const { data: companiesData } = useQuery({
    queryKey: ["companies-for-transactions"],
    queryFn: fetchCompanies,
  });

  const { data: companyDetail } = useQuery({
    queryKey: ["company-detail", companyLedgerId],
    queryFn: () => fetchCompanyDetail(companyLedgerId),
    enabled: activeTab === "company" && !!companyLedgerId,
  });

  const companyLedgerRows = React.useMemo(() => {
    if (activeTab !== "company" || !ledgerData?.data) return [];
    return ledgerData.data;
  }, [activeTab, ledgerData?.data]);

  const exportUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    if (companyFilter) params.set("companyId", companyFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return `/api/transactions/export?${params}`;
  }, [companyFilter, startDate, endDate]);

  const statementPdfUrl = React.useMemo(() => {
    if (!companyLedgerId) return undefined;
    const params = new URLSearchParams();
    if (startDate) params.set("from", startDate);
    if (endDate) params.set("to", endDate);
    const qs = params.toString();
    return `/api/companies/${companyLedgerId}/statement/pdf${qs ? `?${qs}` : ""}`;
  }, [companyLedgerId, startDate, endDate]);

  const companies = companiesData?.data ?? [];

  const refreshAdvances = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions-advance"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["company-detail"] });
  };

  const advanceMutation = useMutation({
    mutationFn: async (data: AdvancePaymentSubmit) => {
      const body = {
        companyId: data.companyId,
        amount: data.amount,
        paymentDate: data.paymentDate,
        notes: data.notes,
      };
      return editingAdvance
        ? sendJson(`/api/transactions/advance/${editingAdvance.id}`, "PUT", body, "Failed to update advance payment")
        : sendJson("/api/transactions/advance", "POST", body, "Failed to record advance payment");
    },
    onSuccess: () => {
      refreshAdvances();
      toast.success(editingAdvance ? "Advance payment updated" : "Advance payment recorded");
      setAdvanceDialog(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAdvanceMutation = useMutation({
    mutationFn: (id: string) =>
      sendJson(`/api/transactions/advance/${id}`, "DELETE", undefined, "Failed to delete advance payment"),
    onSuccess: () => {
      refreshAdvances();
      toast.success("Advance payment deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions & Payment Ledger"
        actions={
          <DownloadExportButton type="excel" downloadUrl={exportUrl} />
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ledger">Overall Ledger</TabsTrigger>
          <TabsTrigger value="company">Company Ledger</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
          <TabsTrigger value="advance">Advance Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-[140px]"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-[140px]"
            />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm w-[200px]"
            >
              <option value="">All companies</option>
              {companies.map((c: { id: string; name: string }) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <LedgerTable
            rows={ledgerData?.data ?? []}
            summary={ledgerData?.summary ? { totalDebits: ledgerData.summary.totalInvoiced, totalCredits: ledgerData.summary.totalCollected, netBalance: ledgerData.summary.totalOutstanding } : undefined}
            loading={ledgerLoading}
          />
          {ledgerData?.total > limit && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm py-2">
                Page {page} of {Math.ceil((ledgerData?.total ?? 0) / limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil((ledgerData?.total ?? 0) / limit)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="company" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium">Company (required)</label>
            <select
              value={companyLedgerId}
              onChange={(e) => setCompanyLedgerId(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm w-[260px]"
            >
              <option value="">Select company</option>
              {companies.map((c: { id: string; name: string }) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-[140px]"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-[140px]"
            />
          </div>
          {companyLedgerId && (
            <>
              {companyDetail?.financialSummary && (
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Invoiced</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold">{formatCurrency(companyDetail.financialSummary.totalInvoiced)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Paid</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold text-emerald-600">{formatCurrency(companyDetail.financialSummary.totalPaid)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Outstanding</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold text-destructive">{formatCurrency(companyDetail.financialSummary.outstanding)}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <StatementGenerator companyId={companyLedgerId} companyName={companyDetail?.name} />
                <DownloadExportButton
                  type="pdf"
                  label="Download statement PDF"
                  downloadUrl={statementPdfUrl}
                  disabled={!companyLedgerId}
                />
                <DownloadExportButton
                  type="excel"
                  downloadUrl={companyLedgerId ? `/api/transactions/export?companyId=${companyLedgerId}&startDate=${startDate}&endDate=${endDate}` : undefined}
                  disabled={!companyLedgerId}
                />
              </div>
              <LedgerTable
                rows={companyLedgerRows}
                loading={ledgerLoading && !!companyLedgerId}
                emptyMessage="No transactions for this company in the selected range."
              />
            </>
          )}
          {!companyLedgerId && (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
              Select a company to view ledger and generate statement.
            </div>
          )}
        </TabsContent>

        <TabsContent value="aging" className="space-y-4">
          <AgingChart companies={agingData?.companies ?? []} />
          <AgingReport
            companies={agingData?.companies ?? []}
            totals={agingData?.totals ?? { current: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0 }}
            loading={agingLoading}
          />
          <DownloadExportButton type="excel" downloadUrl="/api/transactions/export" />
        </TabsContent>

        <TabsContent value="advance" className="space-y-4">
          <AdvancePayments
            payments={advanceData ?? []}
            loading={advanceLoading}
            onRecordAdvance={() => setAdvanceDialog("create")}
            onEdit={(row) => setAdvanceDialog(row)}
            onDelete={hasRole("ADMIN") ? (row) => setAdvanceToDelete(row) : undefined}
          />
          <AdvancePaymentDialog
            open={advanceDialog !== null}
            onOpenChange={(open) => !open && setAdvanceDialog(null)}
            companies={companies}
            initial={
              editingAdvance
                ? {
                    companyId: editingAdvance.companyId,
                    companyName: editingAdvance.companyName,
                    amount: editingAdvance.amount,
                    paymentDate: editingAdvance.paymentDate,
                    notes: editingAdvance.notes,
                  }
                : null
            }
            onSubmit={(data) => advanceMutation.mutate(data)}
            isLoading={advanceMutation.isPending}
          />
          <ConfirmDialog
            open={advanceToDelete !== null}
            onOpenChange={(open) => !open && setAdvanceToDelete(null)}
            title="Delete advance payment?"
            description={
              advanceToDelete
                ? `${advanceToDelete.referenceNumber ?? "This advance"} for ${advanceToDelete.companyName} (${formatCurrency(advanceToDelete.amount, "AED")}) will be removed from the ledger. This cannot be undone.`
                : undefined
            }
            confirmLabel="Delete"
            onConfirm={async () => {
              if (advanceToDelete) await deleteAdvanceMutation.mutateAsync(advanceToDelete.id).catch(() => undefined);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
