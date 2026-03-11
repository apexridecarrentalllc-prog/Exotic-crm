import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import type { Prisma } from "@prisma/client";
import { parseISO, isValid } from "date-fns";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { StatementPDF } from "@/lib/pdf/StatementPDF";
import type { StatementPDFData } from "@/lib/pdf/StatementPDF";

export async function generateStatementPdfBuffer(
  companyId: string,
  options?: { fromDate?: string; toDate?: string }
): Promise<Buffer> {
  const fromParam = options?.fromDate;
  const toParam = options?.toDate;
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
  if (!company) throw new Error("Company not found");

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
  const paymentWhere: Prisma.PaymentWhereInput = { companyId };
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
        paidAmount: true,
        balanceAmount: true,
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
      },
    }),
  ]);

  const rawEntries: { date: Date; type: "invoice" | "payment"; data: typeof invoices[0] | typeof payments[0] }[] = [];
  for (const inv of invoices) {
    rawEntries.push({ date: inv.issueDate, type: "invoice", data: inv });
  }
  for (const pay of payments) {
    rawEntries.push({ date: pay.paymentDate, type: "payment", data: pay });
  }
  rawEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

  const entries: StatementPDFData["entries"] = [];
  let runningBalance = 0;

  for (const { date, type, data } of rawEntries) {
    const dateStr = date.toISOString().split("T")[0];
    if (type === "invoice") {
      const inv = data as typeof invoices[0];
      const amount = toNum(inv.totalAmount);
      runningBalance += amount;
      entries.push({
        date: dateStr,
        description: `Invoice ${inv.invoiceNumber}`,
        reference: inv.invoiceNumber,
        debit: amount,
        credit: 0,
        balance: runningBalance,
      });
    } else {
      const pay = data as typeof payments[0];
      const amount = toNum(pay.amount);
      runningBalance -= amount;
      entries.push({
        date: dateStr,
        description: pay.referenceNumber ? `Payment - ${pay.referenceNumber}` : "Payment",
        reference: pay.referenceNumber ?? pay.id,
        debit: 0,
        credit: amount,
        balance: runningBalance,
      });
    }
  }

  const openingBalance =
    entries.length > 0
      ? entries[0].balance - entries[0].debit + entries[0].credit
      : 0;
  const closingBalance = runningBalance;
  const primaryContact = company.contacts[0];

  const statementData: StatementPDFData = {
    company: {
      name: company.name,
      address: company.address,
      city: company.city,
      country: company.country,
      primaryContact: primaryContact
        ? {
            name: primaryContact.name,
            email: primaryContact.email ?? null,
            phone: primaryContact.phone ?? null,
          }
        : null,
    },
    fromDate: fromDate?.toISOString().split("T")[0] ?? null,
    toDate: toDate?.toISOString().split("T")[0] ?? null,
    openingBalance,
    entries,
    closingBalance,
    currency: company.currency ?? "PKR",
    generatedAt: new Date().toISOString(),
  };

  const doc = React.createElement(StatementPDF, { statement: statementData });
  const buffer = await renderToBuffer(doc as React.ReactElement);
  return Buffer.from(buffer);
}
