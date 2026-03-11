import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { exportTransactionsToExcel } from "@/lib/excel";
import { parseISO, isValid, startOfDay, endOfDay } from "date-fns";
import { differenceInDays } from "date-fns";

async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || undefined;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (startDateParam) {
      const d = parseISO(startDateParam);
      if (isValid(d)) startDate = startOfDay(d);
    }
    if (endDateParam) {
      const d = parseISO(endDateParam);
      if (isValid(d)) endDate = endOfDay(d);
    }

    const invoiceWhere: Prisma.InvoiceWhereInput = { status: { not: "CANCELLED" } };
    if (companyId) invoiceWhere.companyId = companyId;
    if (startDate || endDate) {
      invoiceWhere.issueDate = {};
      if (startDate) invoiceWhere.issueDate.gte = startDate;
      if (endDate) invoiceWhere.issueDate.lte = endDate;
    }

    const paymentWhere: Prisma.PaymentWhereInput = {};
    if (companyId) paymentWhere.companyId = companyId;
    if (startDate || endDate) {
      paymentWhere.paymentDate = {};
      if (startDate) paymentWhere.paymentDate.gte = startDate;
      if (endDate) paymentWhere.paymentDate.lte = endDate;
    }

    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: invoiceWhere,
        orderBy: { issueDate: "asc" },
        include: {
          company: { select: { id: true, name: true } },
          shipment: { select: { id: true, referenceNumber: true } },
        },
      }),
      prisma.payment.findMany({
        where: paymentWhere,
        orderBy: { paymentDate: "asc" },
        include: {
          company: { select: { id: true, name: true } },
          shipment: { select: { id: true, referenceNumber: true } },
          invoice: { select: { invoiceNumber: true } },
        },
      }),
    ]);

    type R = { date: Date; type: string; ref: string; desc: string; companyName: string; shipmentRef: string | null; debit: number; credit: number };
    const raw: R[] = [];
    for (const inv of invoices) {
      raw.push({
        date: inv.issueDate,
        type: "INVOICE",
        ref: inv.invoiceNumber,
        desc: `Invoice ${inv.invoiceNumber}`,
        companyName: inv.company.name,
        shipmentRef: inv.shipment?.referenceNumber ?? null,
        debit: toNum(inv.totalAmount),
        credit: 0,
      });
    }
    for (const pay of payments) {
      raw.push({
        date: pay.paymentDate,
        type: "PAYMENT",
        ref: pay.referenceNumber ?? pay.id.slice(-6),
        desc: `Payment${pay.invoice ? ` - ${pay.invoice.invoiceNumber}` : ""}`,
        companyName: pay.company.name,
        shipmentRef: pay.shipment?.referenceNumber ?? null,
        debit: 0,
        credit: toNum(pay.amount),
      });
    }
    raw.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = 0;
    const ledgerRows = raw.map((r) => {
      runningBalance += r.debit - r.credit;
      return {
        Date: r.date.toISOString().slice(0, 10),
        Type: r.type,
        Reference: r.ref,
        Description: r.desc,
        Company: r.companyName,
        Shipment: r.shipmentRef ?? "",
        Debit: r.debit,
        Credit: r.credit,
        Balance: runningBalance,
      };
    });

    const companySummary = new Map<string, { name: string; invoiced: number; paid: number }>();
    for (const inv of invoices) {
      const cur = companySummary.get(inv.companyId) ?? { name: inv.company.name, invoiced: 0, paid: 0 };
      cur.invoiced += toNum(inv.totalAmount);
      companySummary.set(inv.companyId, cur);
    }
    for (const pay of payments) {
      const cur = companySummary.get(pay.companyId) ?? { name: pay.company.name, invoiced: 0, paid: 0 };
      cur.paid += toNum(pay.amount);
      companySummary.set(pay.companyId, cur);
    }
    const summaryRows = Array.from(companySummary.entries()).map(([id, row]) => ({
      CompanyId: id,
      CompanyName: row.name,
      TotalInvoiced: row.invoiced,
      TotalPaid: row.paid,
      Outstanding: row.invoiced - row.paid,
    }));

    const today = startOfDay(new Date());
    const agingInvoices = await prisma.invoice.findMany({
      where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
      select: { companyId: true, dueDate: true, balanceAmount: true, company: { select: { name: true } } },
    });
    const agingByCompany = new Map<string, { name: string; current: number; d31_60: number; d61_90: number; over90: number }>();
    for (const inv of agingInvoices) {
      const bal = toNum(inv.balanceAmount);
      if (bal <= 0) continue;
      const days = differenceInDays(today, inv.dueDate);
      const cur = agingByCompany.get(inv.companyId) ?? { name: inv.company.name, current: 0, d31_60: 0, d61_90: 0, over90: 0 };
      if (days <= 30) cur.current += bal;
      else if (days <= 60) cur.d31_60 += bal;
      else if (days <= 90) cur.d61_90 += bal;
      else cur.over90 += bal;
      agingByCompany.set(inv.companyId, cur);
    }
    const agingRows = Array.from(agingByCompany.entries()).map(([id, row]) => ({
      CompanyId: id,
      CompanyName: row.name,
      current: row.current,
      days31to60: row.d31_60,
      days61to90: row.d61_90,
      over90: row.over90,
      total: row.current + row.d31_60 + row.d61_90 + row.over90,
    }));

    const summaryForExcel = summaryRows.map((s) => ({
      CompanyId: s.CompanyId,
      CompanyName: s.CompanyName,
      TotalInvoiced: s.TotalInvoiced,
      TotalPaid: s.TotalPaid,
      Outstanding: s.Outstanding,
    }));

    const buffer = await exportTransactionsToExcel(ledgerRows, summaryForExcel, agingRows);

    const filename = `transactions-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/transactions/export:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to export" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
