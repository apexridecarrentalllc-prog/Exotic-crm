import * as XLSX from "xlsx";

export const REPORT_TYPES = [
  "monthly_revenue",
  "company_billing",
  "shipment_volume",
  "outstanding_aging",
  "profit_loss",
  "ytd_summary",
  "tax_report",
  "import_export_breakdown",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

/**
 * Build an Excel workbook buffer from report type and JSON data (from GET /api/reports).
 */
export function buildReportWorkbook(reportType: string, data: Record<string, unknown>): Buffer {
  const wb = XLSX.utils.book_new();

  switch (reportType) {
    case "monthly_revenue": {
      const rows = (data.months as Array<{ month: number; year: number; invoiced: number; collected: number; outstanding: number; shipmentCount: number }> ?? []).map((m) => ({
        Month: `${m.year}-${String(m.month).padStart(2, "0")}`,
        Invoiced: m.invoiced,
        Collected: m.collected,
        Outstanding: m.outstanding,
        "Shipment Count": m.shipmentCount,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Monthly Revenue");
      break;
    }
    case "company_billing": {
      const rows = (data.companies as Record<string, unknown>[] ?? []).map((c) => ({
        Company: c.companyName,
        "Total Invoiced": c.totalInvoiced,
        "Total Paid": c.totalPaid,
        Outstanding: c.outstanding,
        "Invoice Count": c.invoiceCount,
        "Shipment Count": c.shipmentCount,
        "Avg Payment Days": c.avgPaymentDays,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Company Billing");
      break;
    }
    case "shipment_volume": {
      const monthRows = (data.months as Array<{ month: number; year: number; import: number; export: number; total: number }> ?? []).map((m) => ({
        Month: `${m.year}-${String(m.month).padStart(2, "0")}`,
        Import: m.import,
        Export: m.export,
        Total: m.total,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthRows), "Volume by Month");
      const statusRows = (data.byStatus as Array<{ status: string; count: number }> ?? []).map((s) => ({ Status: s.status, Count: s.count }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statusRows), "By Status");
      break;
    }
    case "outstanding_aging": {
      const rows = (data.companies as Record<string, unknown>[] ?? []).map((c) => ({
        Company: c.companyName,
        "Current (0-30)": c.current,
        "31-60 Days": c.days31to60,
        "61-90 Days": c.days61to90,
        "90+ Days": c.over90,
        Total: c.total,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Aging");
      break;
    }
    case "profit_loss": {
      const t = (data.totals ?? {}) as Record<string, number | null>;
      const period = (data.period ?? {}) as { start?: string; end?: string; groupBy?: string };
      const summaryRows = [
        { Item: "Period", Amount: `${period.start ?? ""} to ${period.end ?? ""}` },
        { Item: "Revenue (invoices issued, before tax)", Amount: t.revenue },
        { Item: "Expenses", Amount: t.expenses },
        { Item: "Net profit", Amount: t.netProfit },
        { Item: "Profit margin %", Amount: t.marginPercent ?? "" },
        { Item: "Cash received (payments + advance deposits)", Amount: t.cashReceived },
        { Item: "  of which advance deposits", Amount: t.advanceReceived },
        { Item: "Cash paid out (expenses)", Amount: t.cashPaid },
        { Item: "Net cash", Amount: t.netCash },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");
      const periodRows = ((data.rows as Array<Record<string, unknown>>) ?? []).map((r) => ({
        Period: r.label,
        Revenue: r.revenue,
        Expenses: r.expenses,
        "Net Profit": r.netProfit,
        "Cash Received": r.cashReceived,
        "Net Cash": r.netCash,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(periodRows), "By Period");
      const categoryRows = ((data.byCategory as Array<Record<string, unknown>>) ?? []).map((c) => ({
        Category: c.category,
        Amount: c.amount,
        Entries: c.count,
        "Share %": c.sharePercent,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categoryRows), "By Category");
      const shipmentRows: Array<Record<string, unknown>> = ((data.byShipment as Array<Record<string, unknown>>) ?? []).map((s) => ({
        Shipment: s.shipmentRef,
        Revenue: s.revenue,
        Expenses: s.expenses,
        Profit: s.profit,
      }));
      if (Number(data.overheadExpenses ?? 0) > 0) {
        shipmentRows.push({ Shipment: "Overhead (no shipment)", Revenue: 0, Expenses: data.overheadExpenses, Profit: -Number(data.overheadExpenses) });
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(shipmentRows), "By Shipment");
      break;
    }
    case "ytd_summary": {
      const summary = [
        { Field: "Year", Value: data.year },
        { Field: "Total Shipments", Value: data.totalShipments },
        { Field: "Import Shipments", Value: data.importShipments },
        { Field: "Export Shipments", Value: data.exportShipments },
        { Field: "Total Invoiced", Value: data.totalInvoiced },
        { Field: "Total Collected", Value: data.totalCollected },
        { Field: "Total Outstanding", Value: data.totalOutstanding },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "YTD Summary");
      const topRows = (data.topCompanies as Record<string, unknown>[] ?? []).map((c) => ({ Company: c.companyName, "Total Invoiced": c.totalInvoiced }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topRows), "Top Companies");
      break;
    }
    case "tax_report": {
      const rows = (data.items as Record<string, unknown>[] ?? []).map((i) => ({
        Period: i.period,
        "Invoice #": i.invoiceNumber,
        Company: i.companyName,
        Subtotal: i.subtotal,
        "Tax Rate %": i.taxRate,
        "Tax Amount": i.taxAmount,
        "Withholding Tax": i.withholdingTax,
        "Net Amount": i.netAmount,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Tax Report");
      const totRows = [{ TotalTax: (data.totals as { totalTax?: number })?.totalTax ?? 0, TotalWHT: (data.totals as { totalWHT?: number })?.totalWHT ?? 0 }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(totRows), "Totals");
      break;
    }
    case "import_export_breakdown": {
      const imp = (data.import ?? {}) as { count?: number; value?: number; topCompanies?: Record<string, unknown>[] };
      const exp = (data.export ?? {}) as { count?: number; value?: number; topCompanies?: Record<string, unknown>[] };
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet([
          { Type: "Import", Count: imp.count, Value: imp.value },
          { Type: "Export", Count: exp.count, Value: exp.value },
        ]),
        "Summary"
      );
      const impTop = (imp.topCompanies ?? []).map((c) => ({ Company: c.companyName, Value: c.value }));
      const expTop = (exp.topCompanies ?? []).map((c) => ({ Company: c.companyName, Value: c.value }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(impTop), "Top Import");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expTop), "Top Export");
      break;
    }
    default:
      throw new Error("Unknown report type");
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buf as ArrayBuffer);
}

/**
 * Build a short HTML summary of report data for the email body.
 */
export function buildReportSummaryHtml(reportType: string, data: Record<string, unknown>): string {
  const now = new Date();
  const month = now.toLocaleString("default", { month: "long" });
  const year = String(now.getFullYear());
  switch (reportType) {
    case "monthly_revenue": {
      const months = (data.months as unknown[]) ?? [];
      return `<p><strong>Monthly Revenue</strong>: ${months.length} month(s) of data.</p>`;
    }
    case "company_billing": {
      const companies = (data.companies as unknown[]) ?? [];
      return `<p><strong>Company Billing</strong>: ${companies.length} companies.</p>`;
    }
    case "profit_loss": {
      const t = (data.totals ?? {}) as Record<string, number | null>;
      return `<p><strong>Profit &amp; Loss</strong>: Revenue ${t.revenue ?? "—"}, Expenses ${t.expenses ?? "—"}, Net profit ${t.netProfit ?? "—"}.</p>`;
    }
    case "ytd_summary":
      return `<p><strong>YTD Summary</strong> for ${year}. Total Shipments: ${(data.totalShipments as number) ?? "—"}, Total Invoiced: ${(data.totalInvoiced as number) ?? "—"}.</p>`;
    default:
      return `<p>Report: ${reportType}. Period: ${month} ${year}.</p>`;
  }
}
