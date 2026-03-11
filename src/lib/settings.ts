import { prisma } from "@/lib/prisma";

/**
 * Get a single setting value by key. Returns null if not set.
 */
export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.systemSettings.findUnique({
    where: { key },
    select: { value: true },
  });
  return row?.value ?? null;
}

/**
 * Get multiple settings as a record. Keys not present will be omitted.
 */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const rows = await prisma.systemSettings.findMany({
    where: { key: { in: keys } },
    select: { key: true, value: true },
  });
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

/**
 * Get all settings as a flat record (key -> value).
 */
export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.systemSettings.findMany({
    select: { key: true, value: true },
  });
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

/**
 * Set one or more settings. Values must be strings; for objects use JSON.stringify.
 * updatedById is optional (e.g. for system defaults).
 */
export async function setSettings(
  entries: Record<string, string>,
  updatedById?: string
): Promise<void> {
  const now = new Date();
  for (const [key, value] of Object.entries(entries)) {
    await prisma.systemSettings.upsert({
      where: { key },
      create: { key, value, updatedById },
      update: { value, updatedAt: now, updatedById: updatedById ?? undefined },
    });
  }
}

/** Known setting keys for type-safe usage and defaults. */
export const SETTING_KEYS = {
  // Company profile
  COMPANY_NAME: "company_name",
  COMPANY_LOGO: "company_logo",
  COMPANY_ADDRESS: "company_address",
  COMPANY_CITY: "company_city",
  COMPANY_COUNTRY: "company_country",
  COMPANY_PHONE: "company_phone",
  COMPANY_EMAIL: "company_email",
  COMPANY_WEBSITE: "company_website",
  COMPANY_NTN: "company_ntn",
  COMPANY_STRN: "company_strn",
  // Invoice
  INVOICE_PREFIX: "invoice_prefix",
  SHIPMENT_PREFIX_IMPORT: "shipment_prefix_import",
  SHIPMENT_PREFIX_EXPORT: "shipment_prefix_export",
  DEFAULT_PAYMENT_TERMS: "default_payment_terms",
  DEFAULT_CURRENCY: "default_currency",
  DEFAULT_TAX_RATE: "default_tax_rate",
  INVOICE_REMINDER_DAYS: "invoice_reminder_days",
  INVOICE_TERMS: "invoice_terms",
  INVOICE_PDF_FOOTER: "invoice_pdf_footer",
  // Email
  SMTP_HOST: "smtp_host",
  SMTP_PORT: "smtp_port",
  SMTP_USER: "smtp_user",
  SMTP_PASSWORD: "smtp_password",
  SMTP_FROM_NAME: "smtp_from_name",
  SMTP_FROM_EMAIL: "smtp_from_email",
  EMAIL_SENDING_ENABLED: "email_sending_enabled",
  // Currency & tax
  BASE_CURRENCY: "base_currency",
  CURRENCIES_ENABLED: "currencies_enabled",
  TAX_RATES: "tax_rates",
  // System
  DATA_RETENTION_MONTHS: "data_retention_months",
} as const;
