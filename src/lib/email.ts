/**
 * Email service using Nodemailer.
 * Configure with SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (and optionally SMTP_SECURE).
 * The EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM names used in render.yaml and
 * .env.example are accepted too; the SMTP_* name wins when both are set.
 * Logs sent/failed emails to EmailLog when log options are provided.
 */
import { prisma } from "@/lib/prisma";
import { getSetting, SETTING_KEYS } from "@/lib/settings";
import {
  DEFAULT_BRAND_NAME,
  formatEmailAmount,
  invoiceEmailTemplate,
  paymentReminderTemplate,
  welcomeEmailTemplate,
  passwordResetEmailTemplate,
  monthlyReportEmailTemplate,
  statementEmailTemplate,
} from "@/lib/email-templates";

/**
 * The company name shown in emails: the Company Name set in Settings (the same one the invoice PDF uses),
 * else the NEXT_PUBLIC_COMPANY_NAME fallback. Never blocks an email if Settings cannot be read.
 */
export async function getBrandName(): Promise<string> {
  try {
    const name = (await getSetting(SETTING_KEYS.COMPANY_NAME))?.trim();
    if (name) return name;
  } catch (e) {
    console.warn("Could not read company name for email:", e);
  }
  return DEFAULT_BRAND_NAME;
}

/** First non-empty value among the given environment variable names. */
function env(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export class EmailNotConfiguredError extends Error {
  constructor() {
    super(
      "Email is not set up on this server. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM " +
        "(or EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD and EMAIL_FROM)."
    );
    this.name = "EmailNotConfiguredError";
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(env("SMTP_HOST", "EMAIL_HOST"));
}

export async function getTransporter() {
  const host = env("SMTP_HOST", "EMAIL_HOST");
  // Without a host nodemailer would silently try localhost, so say clearly that email is not set up.
  if (!host) throw new EmailNotConfiguredError();
  const port = Number(env("SMTP_PORT", "EMAIL_PORT") ?? 587);
  const secureSetting = env("SMTP_SECURE", "EMAIL_SECURE");
  const user = env("SMTP_USER", "EMAIL_USER");
  const pass = env("SMTP_PASS", "SMTP_PASSWORD", "EMAIL_PASS", "EMAIL_PASSWORD");
  const { default: nodemailer } = await import("nodemailer");
  return nodemailer.createTransport({
    host,
    port,
    secure: secureSetting !== undefined ? secureSetting === "true" : port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
}

export function getFrom(): string {
  return env("SMTP_FROM", "EMAIL_FROM") ?? "noreply@iemanager.com";
}

/** A short, plain-English reason for a failed email, safe to show to staff (no credentials, no stack). */
export function describeEmailError(err: unknown): string {
  if (err instanceof EmailNotConfiguredError) return "Email is not set up on this server.";
  const e = err as { code?: string; message?: string } | null;
  switch (e?.code) {
    case "ECONNREFUSED":
    case "ECONNECTION":
    case "ETIMEDOUT":
    case "ESOCKET":
    case "ENOTFOUND":
    case "EDNS":
      return "Could not connect to the email server.";
    case "EAUTH":
      return "The email server rejected the login. Check the email username and password.";
    case "EENVELOPE":
      return "The email server rejected the sender or recipient address.";
  }
  return (e?.message ?? "Unknown error").slice(0, 160);
}

export interface EmailLogParams {
  sentById?: string | null;
  invoiceId?: string | null;
  companyId?: string | null;
}

async function logEmail(
  to: string,
  subject: string,
  status: "SENT" | "FAILED",
  error?: string | null,
  params?: EmailLogParams
): Promise<void> {
  try {
    await prisma.emailLog.create({
      data: {
        to,
        subject,
        status,
        error: error ?? undefined,
        invoiceId: params?.invoiceId ?? undefined,
        companyId: params?.companyId ?? undefined,
        sentById: params?.sentById ?? undefined,
      },
    });
  } catch (e) {
    console.warn("EmailLog create failed:", e);
  }
}

export interface InvoiceForEmail {
  invoiceNumber: string;
  dueDate: Date;
  totalAmount: number | string;
  currency: string;
  shipment?: { referenceNumber: string } | null;
}

export async function sendInvoiceEmail(params: {
  invoice: InvoiceForEmail;
  pdfBuffer: Buffer;
  recipientEmail: string;
  recipientName: string;
  viewUrl: string;
  paymentInstructions?: string;
  log?: EmailLogParams & { invoiceId: string };
}): Promise<void> {
  const { invoice, pdfBuffer, recipientEmail, recipientName, viewUrl, paymentInstructions, log } = params;
  const brandName = await getBrandName();
  const subject = `Invoice ${invoice.invoiceNumber} from ${brandName} for Shipment ${invoice.shipment?.referenceNumber ?? "N/A"}`;
  const totalAmount = formatEmailAmount(invoice.totalAmount);
  const html = invoiceEmailTemplate({
    invoiceNumber: invoice.invoiceNumber,
    shipmentRef: invoice.shipment?.referenceNumber ?? "—",
    dueDate: invoice.dueDate instanceof Date ? invoice.dueDate.toISOString().slice(0, 10) : String(invoice.dueDate).slice(0, 10),
    totalAmount,
    currency: "AED",
    viewUrl,
    paymentInstructions,
    recipientName,
    brandName,
  });
  try {
    const transporter = await getTransporter();
    await transporter.sendMail({
      from: getFrom(),
      to: recipientEmail,
      subject,
      html,
      attachments: [
        { filename: `invoice-${invoice.invoiceNumber}.pdf`, content: pdfBuffer, contentType: "application/pdf" },
      ],
    });
    if (log) await logEmail(recipientEmail, subject, "SENT", null, { ...log, invoiceId: log.invoiceId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (log) await logEmail(recipientEmail, subject, "FAILED", message, { ...log, invoiceId: log.invoiceId });
    throw err;
  }
}

export interface CompanyForReminder {
  name: string;
}

export async function sendPaymentReminderEmail(params: {
  invoice: InvoiceForEmail & { id: string };
  company: CompanyForReminder;
  daysOverdue: number;
  recipientEmail: string;
  viewUrl: string;
  paymentMethods?: string;
  log?: EmailLogParams & { invoiceId: string };
}): Promise<void> {
  const { invoice, company, daysOverdue, recipientEmail, viewUrl, paymentMethods, log } = params;
  const subject = `Payment Reminder: Invoice ${invoice.invoiceNumber} is ${daysOverdue} day(s) overdue`;
  const totalAmount = formatEmailAmount(invoice.totalAmount);
  const dueDateStr = invoice.dueDate instanceof Date ? invoice.dueDate.toISOString().slice(0, 10) : String(invoice.dueDate).slice(0, 10);
  const html = paymentReminderTemplate({
    invoiceNumber: invoice.invoiceNumber,
    companyName: company.name,
    daysOverdue,
    amountDue: totalAmount,
    currency: "AED",
    dueDate: dueDateStr,
    viewUrl,
    paymentMethods,
    brandName: await getBrandName(),
  });
  const transporter = await getTransporter();
  try {
    await transporter.sendMail({
      from: getFrom(),
      to: recipientEmail,
      subject,
      html,
    });
    if (log) await logEmail(recipientEmail, subject, "SENT", null, { ...log, invoiceId: log.invoiceId });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (log) await logEmail(recipientEmail, subject, "FAILED", message, { ...log, invoiceId: log.invoiceId });
    throw e;
  }
}

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  temporaryPassword: string;
  forcePasswordChange?: boolean;
  loginUrl: string;
}): Promise<void> {
  const { to, name, temporaryPassword, forcePasswordChange, loginUrl } = params;
  const brandName = await getBrandName();
  const subject = `Welcome to ${brandName} - Your Login Credentials`;
  const html = welcomeEmailTemplate({
    brandName,
    name,
    email: to,
    temporaryPassword,
    loginUrl,
    forcePasswordChange,
  });
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: getFrom(),
    to,
    subject,
    html,
    text: `Hello ${name},\n\nYour ${brandName} account has been created.\n\nEmail: ${to}\nTemporary password: ${temporaryPassword}\n\nLog in at: ${loginUrl}\n\nBest regards,\n${brandName}`,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  temporaryPassword: string;
  loginUrl: string;
}): Promise<void> {
  const { to, name, temporaryPassword, loginUrl } = params;
  const brandName = await getBrandName();
  const subject = `${brandName} - Password Reset`;
  const html = passwordResetEmailTemplate({ name, temporaryPassword, loginUrl, brandName });
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: getFrom(),
    to,
    subject,
    html,
    text: `Hello ${name},\n\nYour password has been reset. New temporary password: ${temporaryPassword}\n\nLog in at: ${loginUrl}\n\nBest regards,\n${brandName}`,
  });
}

export interface MonthlyReportAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export async function sendMonthlyReportEmail(params: {
  recipients: string[];
  month: string;
  year: string;
  summaryHtml: string;
  reportUrl: string;
  attachments: MonthlyReportAttachment[];
}): Promise<void> {
  const { recipients, month, year, summaryHtml, reportUrl, attachments } = params;
  const subject = `Monthly Business Report - ${month} ${year}`;
  const html = monthlyReportEmailTemplate({ month, year, summaryHtml, reportUrl, brandName: await getBrandName() });
  const transporter = await getTransporter();
  const to = recipients.join(", ");
  await transporter.sendMail({
    from: getFrom(),
    to,
    subject,
    html,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType ?? "application/octet-stream",
    })),
  });
}

export interface CompanyForStatement {
  name: string;
  id?: string;
}

export async function sendStatementEmail(params: {
  company: CompanyForStatement;
  pdfBuffer: Buffer;
  recipientEmail: string;
  viewUrl?: string;
  log?: EmailLogParams & { companyId?: string };
}): Promise<void> {
  const { company, pdfBuffer, recipientEmail, viewUrl, log } = params;
  const subject = `Statement of Account - ${company.name}`;
  const html = statementEmailTemplate({ companyName: company.name, viewUrl, brandName: await getBrandName() });
  const transporter = await getTransporter();
  try {
    await transporter.sendMail({
      from: getFrom(),
      to: recipientEmail,
      subject,
      html,
      attachments: [
        { filename: `statement-${company.name.replace(/[^a-z0-9]/gi, "-")}.pdf`, content: pdfBuffer, contentType: "application/pdf" },
      ],
    });
    if (log) await logEmail(recipientEmail, subject, "SENT", null, { ...log, companyId: log.companyId ?? company.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (log) await logEmail(recipientEmail, subject, "FAILED", message, { ...log, companyId: log.companyId ?? company.id });
    throw err;
  }
}