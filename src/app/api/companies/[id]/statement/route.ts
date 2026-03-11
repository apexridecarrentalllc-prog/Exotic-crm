import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { parseISO, isValid } from "date-fns";

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
      include: {
        contacts: { where: { isPrimary: true }, take: 1 },
      },
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
          dueDate: true,
          totalAmount: true,
          paidAmount: true,
          balanceAmount: true,
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
          method: true,
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

    const entries: Array<{
      date: string;
      type: "invoice" | "payment";
      description: string;
      reference: string;
      debit: number;
      credit: number;
      balance: number;
    }> = [];
    let runningBalance = 0;

    for (const { date, type, data } of rawEntries) {
      const dateStr = date.toISOString().split("T")[0];
      if (type === "invoice") {
        const inv = data as (typeof invoices)[0];
        const amount = toNum(inv.totalAmount);
        runningBalance += amount;
        entries.push({
          date: dateStr,
          type: "invoice",
          description: `Invoice ${inv.invoiceNumber}`,
          reference: inv.invoiceNumber,
          debit: amount,
          credit: 0,
          balance: runningBalance,
        });
      } else {
        const pay = data as (typeof payments)[0];
        const amount = toNum(pay.amount);
        runningBalance -= amount;
        entries.push({
          date: dateStr,
          type: "payment",
          description: pay.referenceNumber ? `Payment - ${pay.referenceNumber}` : "Payment",
          reference: pay.referenceNumber ?? pay.id,
          debit: 0,
          credit: amount,
          balance: runningBalance,
        });
      }
    }

    const totalInvoiced = invoices.reduce((sum, inv) => sum + toNum(inv.totalAmount), 0);
    const totalPaid = payments.reduce((sum, p) => sum + toNum(p.amount), 0);
    const outstanding = invoices.reduce((sum, inv) => sum + toNum(inv.balanceAmount), 0);

    const primaryContact = company.contacts[0];
    const statement = {
      company: {
        id: company.id,
        name: company.name,
        address: company.address,
        city: company.city,
        country: company.country,
        currency: company.currency,
        primaryContact: primaryContact
          ? {
              name: primaryContact.name,
              email: primaryContact.email,
              phone: primaryContact.phone,
            }
          : null,
      },
      fromDate: fromDate?.toISOString().split("T")[0] ?? null,
      toDate: toDate?.toISOString().split("T")[0] ?? null,
      generatedAt: new Date().toISOString(),
      entries,
      summary: {
        totalInvoiced,
        totalPaid,
        outstanding,
        closingBalance: runningBalance,
      },
    };

    return NextResponse.json(statement);
  } catch (error) {
    console.error("GET /api/companies/[id]/statement:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to generate statement" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
