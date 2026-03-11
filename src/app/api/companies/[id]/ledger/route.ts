import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { parseISO, isValid } from "date-fns";

type LedgerEntry =
  | {
      type: "invoice";
      id: string;
      date: string;
      description: string;
      reference: string;
      debit: number;
      credit: number;
      balance: number;
      invoiceId: string;
      shipmentId?: string;
    }
  | {
      type: "payment";
      id: string;
      date: string;
      description: string;
      reference: string;
      debit: number;
      credit: number;
      balance: number;
      paymentId: string;
      invoiceId?: string;
    };

async function getHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const companyId = context.params?.id;
  if (!companyId) {
    return NextResponse.json(
      { error: "Bad Request", message: "Company ID is required" },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    let fromDate: Date | undefined;
    let toDate: Date | undefined;
    if (fromParam) {
      const d = parseISO(fromParam);
      if (isValid(d)) fromDate = d;
    }
    if (toParam) {
      const d = parseISO(toParam);
      if (isValid(d)) toDate = d;
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, currency: true },
    });
    if (!company) {
      return NextResponse.json(
        { error: "Not Found", message: "Company not found" },
        { status: 404 }
      );
    }

    const issueDateFilter: { gte?: Date; lte?: Date } = {};
    if (fromDate) issueDateFilter.gte = fromDate;
    if (toDate) issueDateFilter.lte = toDate;

    const invoiceWhere: Prisma.InvoiceWhereInput = {
      companyId,
      status: { not: "CANCELLED" },
    };
    if (Object.keys(issueDateFilter).length > 0) invoiceWhere.issueDate = issueDateFilter;

    const paymentDateFilter: { gte?: Date; lte?: Date } = {};
    if (fromDate) paymentDateFilter.gte = fromDate;
    if (toDate) paymentDateFilter.lte = toDate;

    const paymentWhere: Prisma.PaymentWhereInput = {
      companyId,
    };
    if (Object.keys(paymentDateFilter).length > 0) paymentWhere.paymentDate = paymentDateFilter;

    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: invoiceWhere,
        orderBy: { issueDate: "asc" },
        select: {
          id: true,
          invoiceNumber: true,
          issueDate: true,
          totalAmount: true,
          shipmentId: true,
        },
      }),
      prisma.payment.findMany({
        where: paymentWhere,
        orderBy: { paymentDate: "asc" },
        select: {
          id: true,
          paymentDate: true,
          amount: true,
          referenceNumber: true,
          invoiceId: true,
        },
      }),
    ]);

    const rawEntries: { date: Date; type: "invoice" | "payment"; data: (typeof invoices)[0] | (typeof payments)[0] }[] = [];
    for (const inv of invoices) {
      rawEntries.push({ date: inv.issueDate, type: "invoice", data: inv });
    }
    for (const pay of payments) {
      rawEntries.push({ date: pay.paymentDate, type: "payment", data: pay });
    }
    rawEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = 0;
    const entries: LedgerEntry[] = [];

    for (const { date, type, data } of rawEntries) {
      const dateStr = date.toISOString().split("T")[0];
      if (type === "invoice") {
        const inv = data as (typeof invoices)[0];
        const amount = toNum(inv.totalAmount);
        runningBalance += amount;
        entries.push({
          type: "invoice",
          id: inv.id,
          date: dateStr,
          description: `Invoice ${inv.invoiceNumber}`,
          reference: inv.invoiceNumber,
          debit: amount,
          credit: 0,
          balance: runningBalance,
          invoiceId: inv.id,
          shipmentId: inv.shipmentId ?? undefined,
        });
      } else {
        const pay = data as (typeof payments)[0];
        const amount = toNum(pay.amount);
        runningBalance -= amount;
        entries.push({
          type: "payment",
          id: pay.id,
          date: dateStr,
          description: pay.referenceNumber ? `Payment - ${pay.referenceNumber}` : "Payment",
          reference: pay.referenceNumber ?? pay.id,
          debit: 0,
          credit: amount,
          balance: runningBalance,
          paymentId: pay.id,
          invoiceId: pay.invoiceId ?? undefined,
        });
      }
    }

    return NextResponse.json({
      companyId: company.id,
      companyName: company.name,
      currency: company.currency,
      fromDate: fromDate?.toISOString().split("T")[0] ?? null,
      toDate: toDate?.toISOString().split("T")[0] ?? null,
      entries,
      closingBalance: runningBalance,
    });
  } catch (error) {
    console.error("GET /api/companies/[id]/ledger:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch ledger" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
