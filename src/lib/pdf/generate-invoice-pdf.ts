import path from "path";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings";
import { InvoicePDF } from "@/lib/pdf/InvoicePDF";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";

export async function generateInvoicePdfBuffer(invoiceId: string): Promise<Buffer> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      company: true,
      shipment: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) throw new Error("Invoice not found");

  const company = invoice.company;
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { companyId: invoice.companyId },
  });

  const [companyName, termsText, logoPath] = await Promise.all([
    getSetting(SETTING_KEYS.COMPANY_NAME),
    getSetting(SETTING_KEYS.INVOICE_TERMS),
    getSetting(SETTING_KEYS.COMPANY_LOGO),
  ]);
  let issuerLogoUrl: string | null = null;
  if (logoPath && logoPath.startsWith("/")) {
    issuerLogoUrl = path.join(process.cwd(), "public", logoPath.slice(1).replace(/^\//, ""));
  }

  const pdfData = {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    currency: invoice.currency,
    subtotal: toNum(invoice.subtotal),
    taxRate: toNum(invoice.taxRate),
    taxAmount: toNum(invoice.taxAmount),
    withholdingTax: toNum(invoice.withholdingTax),
    totalAmount: toNum(invoice.totalAmount),
    paidAmount: toNum(invoice.paidAmount),
    balanceAmount: toNum(invoice.balanceAmount),
    status: invoice.status,
    notes: invoice.notes,
    company: {
      name: company.name,
      address: company.address,
      city: company.city,
      country: company.country,
      taxNumber: company.taxNumber,
      ntn: company.taxNumber,
      strn: null,
    },
    termsAndConditions: termsText ?? process.env.NEXT_PUBLIC_INVOICE_TERMS ?? null,
    issuerCompanyName: companyName ?? null,
    issuerTagline: null,
    issuerLogoUrl,
    generatedAt: new Date().toISOString(),
    shipment: invoice.shipment
      ? { referenceNumber: invoice.shipment.referenceNumber }
      : null,
    lineItems: invoice.lineItems.map((li) => ({
      description: li.description,
      quantity: toNum(li.quantity),
      unitRate: toNum(li.unitRate),
      amount: toNum(li.amount),
      taxRate: toNum(li.taxRate),
    })),
    bankAccounts: bankAccounts.map((b) => ({
      bankName: b.bankName,
      accountNumber: b.accountNumber,
      iban: b.iban,
      branchName: b.branchName,
    })),
  };

  const doc = React.createElement(InvoicePDF, { invoice: pdfData });
  const buffer = await renderToBuffer(doc as React.ReactElement);
  return Buffer.from(buffer);
}
