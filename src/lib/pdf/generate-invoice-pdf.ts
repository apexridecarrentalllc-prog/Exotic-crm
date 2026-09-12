import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings";
import { InvoicePDF } from "@/lib/pdf/InvoicePDF";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";

function resolveLogoPath(logoPath: string | null): string | null {
  const candidates: string[] = [];
  if (logoPath && logoPath.startsWith("/")) {
    candidates.push(path.join(process.cwd(), "public", logoPath.replace(/^\//, "")));
  }
  candidates.push(path.join(process.cwd(), "public", "invoice-logo.png"));
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

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

  const pdfData = {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate.toISOString(),
    subtotal: toNum(invoice.subtotal),
    totalAmount: toNum(invoice.totalAmount),
    paidAmount: toNum(invoice.paidAmount),
    balanceAmount: toNum(invoice.balanceAmount),
    status: invoice.status,
    company: {
      name: company.name,
      address: company.address,
      city: company.city,
      country: company.country,
    },
    termsAndConditions: termsText ?? process.env.NEXT_PUBLIC_INVOICE_TERMS ?? null,
    issuerCompanyName: companyName ?? null,
    issuerTagline: null,
    issuerLogoUrl: resolveLogoPath(logoPath),
    generatedAt: new Date().toISOString(),
    shipment: invoice.shipment
      ? { referenceNumber: invoice.shipment.referenceNumber }
      : null,
    lineItems: invoice.lineItems.map((li) => ({
      description: li.description,
      quantity: toNum(li.quantity),
      unitRate: toNum(li.unitRate),
      amount: toNum(li.amount),
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
