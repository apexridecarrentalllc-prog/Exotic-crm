import ExcelJS from "exceljs";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF4F46E5" },
};
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" } };

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function applyHeaderStyle(worksheet: ExcelJS.Worksheet, headerRow: ExcelJS.Row) {
  headerRow.font = HEADER_FONT;
  headerRow.fill = HEADER_FILL;
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });
  worksheet.views = [{ state: "frozen", ySplit: 1, activeCell: "A2" }];
  worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headerRow.cellCount } };
}

function autoSizeColumns(worksheet: ExcelJS.Worksheet) {
  worksheet.columns.forEach((col) => {
    let max = 10;
    col?.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > max) max = Math.min(len, 60);
    });
    col.width = max + 1;
  });
}

/** Shipment record with optional nested stages (company name on stage). */
export type ShipmentForExport = {
  id: string;
  referenceNumber: string;
  type: string;
  status: string;
  origin: string;
  destination: string;
  goodsDescription: string;
  containerNumber?: string | null;
  awbNumber?: string | null;
  cargoValue?: number | string | null;
  currency?: string | null;
  orderDate: Date | string;
  expectedDelivery?: Date | string | null;
  actualDelivery?: Date | string | null;
  createdAt?: Date | string;
  stages?: Array<{
    id: string;
    stageName: string;
    stageOrder: number;
    status: string;
    startDate?: Date | string | null;
    completedDate?: Date | string | null;
    company?: { name: string } | null;
    companyId?: string;
  }>;
};

export type ShipmentExportFilters = {
  type?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function exportShipmentsToExcel(
  shipments: ShipmentForExport[],
  _filters?: ShipmentExportFilters
): Promise<ExcelJS.Buffer> {
  void _filters;
  const wb = new ExcelJS.Workbook();
  const wsShipments = wb.addWorksheet("Shipments", { views: [{ state: "frozen", ySplit: 1 }] });
  const shipmentHeaders = [
    "Reference",
    "Type",
    "Status",
    "Origin",
    "Destination",
    "Goods",
    "Container",
    "AWB",
    "Cargo Value",
    "Currency",
    "Order Date",
    "Expected Delivery",
    "Actual Delivery",
    "Created At",
  ];
  wsShipments.addRow(shipmentHeaders);
  const shipHeaderRow = wsShipments.getRow(1);
  applyHeaderStyle(wsShipments, shipHeaderRow);

  for (const s of shipments) {
    wsShipments.addRow([
      s.referenceNumber,
      s.type,
      s.status,
      s.origin,
      s.destination,
      s.goodsDescription,
      s.containerNumber ?? "",
      s.awbNumber ?? "",
      s.cargoValue ?? "",
      s.currency ?? "PKR",
      formatDate(s.orderDate),
      formatDate(s.expectedDelivery),
      formatDate(s.actualDelivery),
      formatDate(s.createdAt),
    ]);
  }
  autoSizeColumns(wsShipments);

  const wsStages = wb.addWorksheet("Stages", { views: [{ state: "frozen", ySplit: 1 }] });
  const stageHeaders = [
    "Shipment Reference",
    "Stage Name",
    "Order",
    "Status",
    "Company",
    "Start Date",
    "Completed Date",
  ];
  wsStages.addRow(stageHeaders);
  const stageHeaderRow = wsStages.getRow(1);
  applyHeaderStyle(wsStages, stageHeaderRow);

  for (const s of shipments) {
    const ref = s.referenceNumber;
    const stages = s.stages ?? [];
    for (const st of stages) {
      const companyName = st.company?.name ?? st.companyId ?? "";
      wsStages.addRow([
        ref,
        st.stageName,
        st.stageOrder,
        st.status,
        companyName,
        formatDate(st.startDate),
        formatDate(st.completedDate),
      ]);
    }
  }
  autoSizeColumns(wsStages);

  return (await wb.xlsx.writeBuffer()) as ExcelJS.Buffer;
}

/** Invoice for export with optional line items. */
export type InvoiceForExport = {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: Date | string;
  dueDate: Date | string;
  currency?: string;
  subtotal: number | string;
  taxAmount?: number | string;
  totalAmount: number | string;
  paidAmount?: number | string;
  balanceAmount?: number | string;
  company?: { name: string } | null;
  shipment?: { referenceNumber: string } | null;
  lineItems?: Array<{
    id: string;
    description: string;
    quantity: number | string;
    unitRate: number | string;
    amount: number | string;
    taxRate?: number | string;
  }>;
};

export async function exportInvoicesToExcel(invoices: InvoiceForExport[]): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  const wsInv = wb.addWorksheet("Invoices", { views: [{ state: "frozen", ySplit: 1 }] });
  const invHeaders = [
    "Invoice #",
    "Status",
    "Company",
    "Shipment",
    "Issue Date",
    "Due Date",
    "Currency",
    "Subtotal",
    "Tax",
    "Total",
    "Paid",
    "Balance",
  ];
  wsInv.addRow(invHeaders);
  applyHeaderStyle(wsInv, wsInv.getRow(1));

  for (const inv of invoices) {
    const row = wsInv.addRow([
      inv.invoiceNumber,
      inv.status,
      inv.company?.name ?? "",
      inv.shipment?.referenceNumber ?? "",
      formatDate(inv.issueDate),
      formatDate(inv.dueDate),
      inv.currency ?? "PKR",
      Number(inv.subtotal),
      Number(inv.taxAmount ?? 0),
      Number(inv.totalAmount),
      Number(inv.paidAmount ?? 0),
      Number(inv.balanceAmount ?? 0),
    ]);
    if (String(inv.status).toUpperCase() === "OVERDUE") {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFCDD2" } };
        cell.font = { color: { argb: "FFB71C1C" } };
      });
    }
  }
  autoSizeColumns(wsInv);

  const wsItems = wb.addWorksheet("Line Items", { views: [{ state: "frozen", ySplit: 1 }] });
  const itemHeaders = ["Invoice #", "Description", "Quantity", "Unit Rate", "Amount", "Tax Rate"];
  wsItems.addRow(itemHeaders);
  applyHeaderStyle(wsItems, wsItems.getRow(1));

  for (const inv of invoices) {
    const items = inv.lineItems ?? [];
    for (const it of items) {
      wsItems.addRow([
        inv.invoiceNumber,
        it.description,
        Number(it.quantity),
        Number(it.unitRate),
        Number(it.amount),
        Number(it.taxRate ?? 0),
      ]);
    }
  }
  autoSizeColumns(wsItems);

  return (await wb.xlsx.writeBuffer()) as ExcelJS.Buffer;
}

export type LedgerRow = {
  Date: string;
  Type: string;
  Reference: string;
  Description?: string;
  Company?: string;
  Shipment?: string;
  Debit: number;
  Credit: number;
  Balance: number;
};

export type LedgerSummaryRow = {
  CompanyId: string;
  CompanyName: string;
  TotalInvoiced: number;
  TotalPaid: number;
  Outstanding: number;
};

export async function exportLedgerToExcel(
  transactions: LedgerRow[],
  summary: LedgerSummaryRow[]
): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  const wsLedger = wb.addWorksheet("Ledger", { views: [{ state: "frozen", ySplit: 1 }] });
  const ledgerHeaders = ["Date", "Type", "Reference", "Description", "Company", "Shipment", "Debit", "Credit", "Balance"];
  wsLedger.addRow(ledgerHeaders);
  applyHeaderStyle(wsLedger, wsLedger.getRow(1));

  for (const t of transactions) {
    wsLedger.addRow([
      t.Date,
      t.Type,
      t.Reference,
      t.Description ?? "",
      t.Company ?? "",
      t.Shipment ?? "",
      t.Debit,
      t.Credit,
      t.Balance,
    ]);
  }
  autoSizeColumns(wsLedger);

  const wsSummary = wb.addWorksheet("Summary", { views: [{ state: "frozen", ySplit: 1 }] });
  const summaryHeaders = ["Company", "Total Invoiced", "Total Paid", "Outstanding"];
  wsSummary.addRow(summaryHeaders);
  applyHeaderStyle(wsSummary, wsSummary.getRow(1));
  for (const s of summary) {
    wsSummary.addRow([s.CompanyName, s.TotalInvoiced, s.TotalPaid, s.Outstanding]);
  }
  autoSizeColumns(wsSummary);

  return (await wb.xlsx.writeBuffer()) as ExcelJS.Buffer;
}

export type AgingRow = {
  CompanyId: string;
  CompanyName: string;
  current?: number;
  days31to60?: number;
  days61to90?: number;
  over90?: number;
  total: number;
};

/** Keys for aging buckets; use same as API if needed. */
const AGING_COLS = ["Current (0-30)", "31-60 Days", "61-90 Days", "90+ Days"] as const;

export async function exportAgingToExcel(agingData: AgingRow[]): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Aging Report", { views: [{ state: "frozen", ySplit: 1 }] });
  const headers = ["Company", ...AGING_COLS, "Total"];
  ws.addRow(headers);
  applyHeaderStyle(ws, ws.getRow(1));

  const green = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFC8E6C9" } };
  const yellow = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFF9C4" } };
  const orange = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFE0B2" } };
  const red = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFCDD2" } };

  for (const row of agingData) {
    const current = Number(row.current ?? 0);
    const d31 = Number(row.days31to60 ?? 0);
    const d61 = Number(row.days61to90 ?? 0);
    const over90 = Number(row.over90 ?? 0);
    const total = Number(row.total ?? 0);
    const r = ws.addRow([row.CompanyName, current, d31, d61, over90, total]);
    [r.getCell(2), r.getCell(3), r.getCell(4), r.getCell(5)].forEach((cell, idx) => {
      const val = [current, d31, d61, over90][idx];
      if (val > 0) {
        if (idx === 0) cell.fill = green;
        else if (idx === 1) cell.fill = yellow;
        else if (idx === 2) cell.fill = orange;
        else cell.fill = red;
      }
    });
  }
  autoSizeColumns(ws);
  return (await wb.xlsx.writeBuffer()) as ExcelJS.Buffer;
}

/** Single workbook with Ledger, Summary, and Aging Report sheets for transactions export. */
export async function exportTransactionsToExcel(
  ledger: LedgerRow[],
  summary: LedgerSummaryRow[],
  aging: AgingRow[]
): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();

  const wsLedger = wb.addWorksheet("Ledger", { views: [{ state: "frozen", ySplit: 1 }] });
  wsLedger.addRow(["Date", "Type", "Reference", "Description", "Company", "Shipment", "Debit", "Credit", "Balance"]);
  applyHeaderStyle(wsLedger, wsLedger.getRow(1));
  for (const t of ledger) {
    wsLedger.addRow([t.Date, t.Type, t.Reference, t.Description ?? "", t.Company ?? "", t.Shipment ?? "", t.Debit, t.Credit, t.Balance]);
  }
  autoSizeColumns(wsLedger);

  const wsSummary = wb.addWorksheet("Summary", { views: [{ state: "frozen", ySplit: 1 }] });
  wsSummary.addRow(["Company", "Total Invoiced", "Total Paid", "Outstanding"]);
  applyHeaderStyle(wsSummary, wsSummary.getRow(1));
  for (const s of summary) {
    wsSummary.addRow([s.CompanyName, s.TotalInvoiced, s.TotalPaid, s.Outstanding]);
  }
  autoSizeColumns(wsSummary);

  const wsAging = wb.addWorksheet("Aging Report", { views: [{ state: "frozen", ySplit: 1 }] });
  wsAging.addRow(["Company", ...AGING_COLS, "Total"]);
  applyHeaderStyle(wsAging, wsAging.getRow(1));
  const green = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFC8E6C9" } };
  const yellow = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFF9C4" } };
  const orange = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFE0B2" } };
  const red = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFCDD2" } };
  for (const row of aging) {
    const current = Number(row.current ?? 0);
    const d31 = Number(row.days31to60 ?? 0);
    const d61 = Number(row.days61to90 ?? 0);
    const over90 = Number(row.over90 ?? 0);
    const total = Number(row.total ?? 0);
    const r = wsAging.addRow([row.CompanyName, current, d31, d61, over90, total]);
    [r.getCell(2), r.getCell(3), r.getCell(4), r.getCell(5)].forEach((cell, idx) => {
      const val = [current, d31, d61, over90][idx];
      if (val > 0) {
        if (idx === 0) cell.fill = green;
        else if (idx === 1) cell.fill = yellow;
        else if (idx === 2) cell.fill = orange;
        else cell.fill = red;
      }
    });
  }
  autoSizeColumns(wsAging);

  return (await wb.xlsx.writeBuffer()) as ExcelJS.Buffer;
}

/** Generate downloadable Excel template for bulk shipment import. */
export async function getShipmentsImportTemplateBuffer(): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Shipments", { views: [{ state: "frozen", ySplit: 1 }] });
  const headers = ["Type", "Origin", "Destination", "GoodsDescription", "ContainerNumber", "CargoValue", "OrderDate"];
  ws.addRow(headers);
  applyHeaderStyle(ws, ws.getRow(1));
  ws.addRow(["IMPORT", "Karachi Port", "Lahore", "Electronics", "CONT-001", "50000", "2025-01-15"]);
  const typeValidation: ExcelJS.DataValidation = {
    type: "list",
    allowBlank: false,
    formulae: ['"IMPORT,EXPORT"'],
    showErrorMessage: true,
    errorTitle: "Invalid Type",
    error: "Choose IMPORT or EXPORT",
  };
  for (let r = 2; r <= 500; r++) {
    ws.getCell(r, 1).dataValidation = typeValidation;
  }
  autoSizeColumns(ws);
  return (await wb.xlsx.writeBuffer()) as ExcelJS.Buffer;
}
