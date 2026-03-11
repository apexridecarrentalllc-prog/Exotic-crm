"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ExportButton } from "@/components/reports/ExportButton";
import { MonthlyRevenueReport } from "@/components/reports/MonthlyRevenueReport";
import { CompanyBillingReport } from "@/components/reports/CompanyBillingReport";
import { ShipmentVolumeReport } from "@/components/reports/ShipmentVolumeReport";
import { TaxReport } from "@/components/reports/TaxReport";
import { YTDSummary } from "@/components/reports/YTDSummary";
import { AgingReport } from "@/components/transactions/AgingReport";
import { AgingChart } from "@/components/transactions/AgingChart";
import { formatCurrency } from "@/lib/invoice-constants";
import toast from "react-hot-toast";
import {
  BarChart3,
  Building2,
  Package,
  Clock,
  TrendingUp,
  Calendar,
  FileText,
  ArrowLeftRight,
} from "lucide-react";

const REPORT_OPTIONS = [
  { id: "monthly_revenue", label: "Monthly Revenue", icon: BarChart3 },
  { id: "company_billing", label: "Company Billing", icon: Building2 },
  { id: "shipment_volume", label: "Shipment Volume", icon: Package },
  { id: "outstanding_aging", label: "Outstanding & Aging", icon: Clock },
  { id: "profit_overview", label: "Profit Overview", icon: TrendingUp },
  { id: "ytd_summary", label: "Year-to-Date Summary", icon: Calendar },
  { id: "tax_report", label: "Tax Report", icon: FileText },
  { id: "import_export_breakdown", label: "Import/Export Breakdown", icon: ArrowLeftRight },
] as const;

async function fetchReport(reportType: string, startDate: string, endDate: string, companyId: string) {
  const params = new URLSearchParams({ reportType });
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (companyId) params.set("companyId", companyId);
  const res = await fetch("/api/reports?" + params);
  if (!res.ok) throw new Error("Failed to load report");
  return res.json();
}

async function fetchCompanies() {
  const res = await fetch("/api/companies?limit=200");
  if (!res.ok) throw new Error("Failed to load companies");
  const j = await res.json();
  return j.data ?? [];
}

export default function ReportsPage() {
  const [reportType, setReportType] = React.useState<string>("monthly_revenue");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [companyId, setCompanyId] = React.useState("");
  const [generateKey, setGenerateKey] = React.useState(0);

  const { data: companies } = useQuery({ queryKey: ["companies-reports"], queryFn: fetchCompanies });

  const yearOnly = reportType === "ytd_summary";
  const currentYear = new Date().getFullYear();
  const endForYtd = yearOnly ? (endDate || String(currentYear) + "-12-31") : endDate;
  const startForYtd = yearOnly ? (endDate ? endDate.slice(0, 4) + "-01-01" : String(currentYear) + "-01-01") : startDate;

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["report", reportType, startForYtd, endForYtd, companyId, generateKey],
    queryFn: () => fetchReport(reportType, startForYtd, endForYtd, companyId),
    enabled: reportType !== "",
  });

  const handleGenerate = () => setGenerateKey((k) => k + 1);
  const showCompany = ["company_billing", "monthly_revenue", "tax_report", "ytd_summary"].includes(reportType);

  return (
    <div className="flex gap-6">
      <aside className="w-56 shrink-0 space-y-1 rounded-lg border bg-card p-2">
        {REPORT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setReportType(opt.id)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                reportType === opt.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              {opt.label}
            </button>
          );
        })}
      </aside>
      <main className="min-w-0 flex-1 space-y-6">
        <PageHeader title="Reports & Analytics" />
        <div className="space-y-4">
          <ReportFilters
            startDate={startDate}
            endDate={endDate}
            companyId={companyId}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onCompanyChange={setCompanyId}
            companies={companies}
            showCompany={showCompany}
            yearOnly={yearOnly}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleGenerate}>Generate Report</Button>
            <ExportButton
              reportType={reportType}
              startDate={startForYtd}
              endDate={endForYtd}
              companyId={companyId}
              onError={(msg) => toast.error(msg)}
            />
          </div>
        </div>

        {reportType === "monthly_revenue" && (
          <MonthlyRevenueReport
            data={reportData?.months ?? []}
            currency="PKR"
            loading={isLoading}
          />
        )}

        {reportType === "company_billing" && (
          <CompanyBillingReport
            data={reportData?.companies ?? []}
            currency="PKR"
            loading={isLoading}
          />
        )}

        {reportType === "shipment_volume" && (
          <ShipmentVolumeReport
            months={reportData?.months ?? []}
            byStatus={reportData?.byStatus ?? []}
            loading={isLoading}
          />
        )}

        {reportType === "outstanding_aging" && (
          <div className="space-y-4">
            <AgingChart companies={reportData?.companies ?? []} />
            <AgingReport
              companies={reportData?.companies ?? []}
              totals={reportData?.totals ?? { current: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0 }}
              loading={isLoading}
            />
          </div>
        )}

        {reportType === "profit_overview" && (
          <div className="space-y-4">
            {isLoading && <div className="rounded-md border p-8 text-center text-muted-foreground">Loading...</div>}
            {!isLoading && reportData?.shipments && (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-left font-medium">Shipment</th>
                      <th className="p-3 text-right">Total Revenue</th>
                      <th className="p-3 text-right">Company Costs</th>
                      <th className="p-3 text-right">Gross Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.shipments as Array<{ shipmentRef: string; totalRevenue: number; companyCosts: number; grossMargin: number }>).map((row) => (
                      <tr key={row.shipmentRef} className="border-b">
                        <td className="p-3 font-medium">{row.shipmentRef}</td>
                        <td className="p-3 text-right tabular-nums">{formatCurrency(row.totalRevenue)}</td>
                        <td className="p-3 text-right tabular-nums">{formatCurrency(row.companyCosts)}</td>
                        <td className="p-3 text-right tabular-nums">{formatCurrency(row.grossMargin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!isLoading && (!reportData?.shipments || reportData.shipments.length === 0) && (
              <p className="text-center text-muted-foreground">No data for the selected period.</p>
            )}
          </div>
        )}

        {reportType === "ytd_summary" && (
          <YTDSummary data={reportData ?? null} currency="PKR" loading={isLoading} />
        )}

        {reportType === "tax_report" && (
          <TaxReport
            items={reportData?.items ?? []}
            totals={reportData?.totals ?? { totalTax: 0, totalWHT: 0 }}
            currency="PKR"
            loading={isLoading}
          />
        )}

        {reportType === "import_export_breakdown" && (
          <div className="space-y-6">
            {isLoading && <div className="rounded-md border p-8 text-center text-muted-foreground">Loading...</div>}
            {!isLoading && reportData && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-primary">Import</h3>
                    <p className="text-2xl font-semibold mt-2">{reportData.import?.count ?? 0} shipments</p>
                    <p className="text-muted-foreground">{formatCurrency(reportData.import?.value ?? 0)}</p>
                    <ul className="mt-2 text-sm">
                      {(reportData.import?.topCompanies ?? []).slice(0, 5).map((c: { companyName: string; value: number }) => (
                        <li key={c.companyName}>{c.companyName}: {formatCurrency(c.value)}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-primary">Export</h3>
                    <p className="text-2xl font-semibold mt-2">{reportData.export?.count ?? 0} shipments</p>
                    <p className="text-muted-foreground">{formatCurrency(reportData.export?.value ?? 0)}</p>
                    <ul className="mt-2 text-sm">
                      {(reportData.export?.topCompanies ?? []).slice(0, 5).map((c: { companyName: string; value: number }) => (
                        <li key={c.companyName}>{c.companyName}: {formatCurrency(c.value)}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
