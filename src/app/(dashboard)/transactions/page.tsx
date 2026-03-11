"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { LedgerTable } from "@/components/transactions/LedgerTable";
import { AgingReport } from "@/components/transactions/AgingReport";
import { AgingChart } from "@/components/transactions/AgingChart";
import { AdvancePayments } from "@/components/transactions/AdvancePayments";
import { StatementGenerator } from "@/components/transactions/StatementGenerator";
import { formatCurrency } from "@/lib/invoice-constants";
import { DownloadExportButton } from "@/components/shared/DownloadExportButton";
import { Plus } from "lucide-react";

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

export default function TransactionsPage() {
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
          <div className="flex justify-end">
            <Button variant="outline" size="sm" disabled>
              <Plus className="h-4 w-4 mr-2" /> Record Advance Payment
            </Button>
          </div>
          <AdvancePayments payments={advanceData ?? []} loading={advanceLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
