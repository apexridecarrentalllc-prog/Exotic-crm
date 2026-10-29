import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { getSetting, getSettings, getBankDetails } from "@/lib/settings";
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

  const [companyName, termsText, logoPath, bankDetails, bankEnabled, profile] = await Promise.all([
    getSetting(SETTING_KEYS.COMPANY_NAME),
    getSetting(SETTING_KEYS.INVOICE_TERMS),
    getSetting(SETTING_KEYS.COMPANY_LOGO),
    getBankDetails(),
    getSetting(SETTING_KEYS.BANK_DETAILS_ENABLED),
    getSettings([
      SETTING_KEYS.COMPANY_EMAIL,
      SETTING_KEYS.COMPANY_ADDRESS,
      SETTING_KEYS.COMPANY_PHONE,
    ]),
  ]);

  // Footer contact details. The address is only what is typed in the Address box (no city or country);
  // line breaks in the box become commas so it reads as one tidy line.
  const issuerEmail = (profile[SETTING_KEYS.COMPANY_EMAIL] ?? "").trim() || null;
  const issuerAddress =
    (profile[SETTING_KEYS.COMPANY_ADDRESS] ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/[,\s]+$/, ""))
      .filter(Boolean)
      .join(", ") || null;
  const issuerPhone = (profile[SETTING_KEYS.COMPANY_PHONE] ?? "").trim() || null;

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
    // Footer text comes only from Settings (Invoice Settings > Terms and conditions / footer text).
    termsAndConditions: termsText?.trim() ? termsText.trim() : null,
    issuerCompanyName: companyName ?? null,
    issuerEmail,
    issuerAddress,
    issuerPhone,
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
    // Our own bank details from Settings, the same on every invoice.
    bankDetails,
    // The bank box is shown unless it has been switched off in Settings > Bank Details.
    showBankDetails: (bankEnabled ?? "").trim().toLowerCase() !== "false",
  };

  const doc = React.createElement(InvoicePDF, { invoice: pdfData });
  const buffer = await renderToBuffer(doc as React.ReactElement);
  return Buffer.from(buffer);
}
