import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { parseISO, isValid, startOfDay, endOfDay } from "date-fns";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export type TransactionType = "INVOICE" | "PAYMENT" | "CREDIT_NOTE";

export interface TransactionRow {
  id: string;
  date: string;
  type: TransactionType;
  referenceNumber: string;
  description: string;
  companyId: string;
  companyName: string;
  shipmentId: string | null;
  shipmentRef: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") || undefined;
    const shipmentId = searchParams.get("shipmentId") || undefined;
    const typeParam = searchParams.get("type") as TransactionType | undefined;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? String(DEFAULT_PAGE), 10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)));

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
    if (shipmentId) invoiceWhere.shipmentId = shipmentId;
    if (startDate || endDate) {
      invoiceWhere.issueDate = {};
      if (startDate) invoiceWhere.issueDate.gte = startDate;
      if (endDate) invoiceWhere.issueDate.lte = endDate;
    }

    const paymentWhere: Prisma.PaymentWhereInput = {};
    if (companyId) paymentWhere.companyId = companyId;
    if (shipmentId) paymentWhere.shipmentId = shipmentId;
    if (startDate || endDate) {
      paymentWhere.paymentDate = {};
      if (startDate) paymentWhere.paymentDate.gte = startDate;
      if (endDate) paymentWhere.paymentDate.lte = endDate;
    }

    const [invoices, payments, creditNotes] = await Promise.all([
      typeParam !== "PAYMENT" && typeParam !== "CREDIT_NOTE"
        ? prisma.invoice.findMany({
            where: invoiceWhere,
            orderBy: { issueDate: "asc" },
            include: {
              company: { select: { id: true, name: true } },
              shipment: { select: { id: true, referenceNumber: true } },
            },
          })
        : [],
      typeParam !== "INVOICE" && typeParam !== "CREDIT_NOTE"
        ? prisma.payment.findMany({
            where: paymentWhere,
            orderBy: { paymentDate: "asc" },
            include: {
              company: { select: { id: true, name: true } },
              shipment: { select: { id: true, referenceNumber: true } },
              invoice: { select: { invoiceNumber: true } },
            },
          })
        : [],
      typeParam !== "INVOICE" && typeParam !== "PAYMENT"
        ? prisma.creditNote.findMany({
            where: {
              ...(companyId && { companyId }),
              ...(shipmentId && { shipmentId }),
              ...(startDate && endDate && {
                createdAt: { gte: startDate, lte: endDate },
              }),
            },
            orderBy: { createdAt: "asc" },
            include: {
              company: { select: { id: true, name: true } },
              invoice: { select: { invoiceNumber: true } },
            },
          })
        : [],
    ]);

    type RawRow = {
      date: Date;
      type: TransactionType;
      id: string;
      ref: string;
      desc: string;
      companyId: string;
      companyName: string;
      shipmentId: string | null;
      shipmentRef: string | null;
      debit: number;
      credit: number;
    };

    const raw: RawRow[] = [];

    for (const inv of invoices as Array<{
      id: string;
      invoiceNumber: string;
      issueDate: Date;
      totalAmount: unknown;
      company: { id: string; name: string };
      shipment: { id: string; referenceNumber: string } | null;
    }>) {
      raw.push({
        date: inv.issueDate,
        type: "INVOICE",
        id: inv.id,
        ref: inv.invoiceNumber,
        desc: `Invoice ${inv.invoiceNumber}`,
        companyId: inv.company.id,
        companyName: inv.company.name,
        shipmentId: inv.shipment?.id ?? null,
        shipmentRef: inv.shipment?.referenceNumber ?? null,
        debit: toNum(inv.totalAmount),
        credit: 0,
      });
    }
    for (const pay of payments as Array<{
      id: string;
      paymentDate: Date;
      amount: unknown;
      referenceNumber: string | null;
      company: { id: string; name: string };
      shipment: { id: string; referenceNumber: string } | null;
      invoice: { invoiceNumber: string } | null;
    }>) {
      raw.push({
        date: pay.paymentDate,
        type: "PAYMENT",
        id: pay.id,
        ref: pay.referenceNumber ?? pay.id.slice(-6),
        desc: `Payment${pay.invoice ? ` - ${pay.invoice.invoiceNumber}` : ""}`,
        companyId: pay.company.id,
        companyName: pay.company.name,
        shipmentId: pay.shipment?.id ?? null,
        shipmentRef: pay.shipment?.referenceNumber ?? null,
        debit: 0,
        credit: toNum(pay.amount),
      });
    }
    for (const cn of creditNotes as Array<{
      id: string;
      creditNoteNumber: string;
      amount: unknown;
      createdAt: Date;
      company: { id: string; name: string };
      invoice: { invoiceNumber: string } | null;
    }>) {
      raw.push({
        date: cn.createdAt,
        type: "CREDIT_NOTE",
        id: cn.id,
        ref: cn.creditNoteNumber,
        desc: `Credit note ${cn.creditNoteNumber}${cn.invoice ? ` (${cn.invoice.invoiceNumber})` : ""}`,
        companyId: cn.company.id,
        companyName: cn.company.name,
        shipmentId: null,
        shipmentRef: null,
        debit: 0,
        credit: toNum(cn.amount),
      });
    }

    raw.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = 0;
    const allRows: TransactionRow[] = raw.map((r) => {
      runningBalance += r.debit - r.credit;
      return {
        id: r.id,
        date: r.date.toISOString().slice(0, 10),
        type: r.type,
        referenceNumber: r.ref,
        description: r.desc,
        companyId: r.companyId,
        companyName: r.companyName,
        shipmentId: r.shipmentId,
        shipmentRef: r.shipmentRef,
        debit: r.debit,
        credit: r.credit,
        runningBalance,
      };
    });

    const totalInvoiced = raw.reduce((s, r) => s + r.debit, 0);
    const totalCollected = raw.reduce((s, r) => s + r.credit, 0);
    const totalOutstanding = totalInvoiced - totalCollected;

    const total = allRows.length;
    const skip = (page - 1) * limit;
    const data = allRows.slice(skip, skip + limit);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalInvoiced,
        totalCollected,
        totalOutstanding,
      },
    });
  } catch (error) {
    console.error("GET /api/transactions:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
