/**
 * Email service using Nodemailer. Configure via SMTP_* env variables.
 * Logs sent/failed emails to EmailLog when log options are provided.
 */
import { prisma } from "@/lib/prisma";
import {
  invoiceEmailTemplate,
  paymentReminderTemplate,
  welcomeEmailTemplate,
  passwordResetEmailTemplate,
  monthlyReportEmailTemplate,
  statementEmailTemplate,
} from "@/lib/email-templates";

const COMPANY_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? process.env.SMTP_FROM_NAME ?? "IE Manager";

export async function getTransporter() {
  const { default: nodemailer } = await import("nodemailer");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

export function getFrom(): string {
  return process.env.SMTP_FROM ?? "noreply@iemanager.com";
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
  const { invoice, pdfBuffer, recipientEmail, recipientName: _recipientName, viewUrl, paymentInstructions, log } = params;
  void _recipientName;
  const subject = `Invoice ${invoice.invoiceNumber} from ${COMPANY_NAME} for Shipment ${invoice.shipment?.referenceNumber ?? "N/A"}`;
  const totalAmount = typeof invoice.totalAmount === "number" ? invoice.totalAmount.toFixed(2) : String(invoice.totalAmount);
  const html = invoiceEmailTemplate({
    invoiceNumber: invoice.invoiceNumber,
    shipmentRef: invoice.shipment?.referenceNumber ?? "—",
    dueDate: invoice.dueDate instanceof Date ? invoice.dueDate.toISOString().slice(0, 10) : String(invoice.dueDate).slice(0, 10),
    totalAmount,
    currency: invoice.currency,
    viewUrl,
    paymentInstructions,
  });
  const transporter = await getTransporter();
  try {
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
  const totalAmount = typeof invoice.totalAmount === "number" ? invoice.totalAmount.toFixed(2) : String(invoice.totalAmount);
  const dueDateStr = invoice.dueDate instanceof Date ? invoice.dueDate.toISOString().slice(0, 10) : String(invoice.dueDate).slice(0, 10);
  const html = paymentReminderTemplate({
    invoiceNumber: invoice.invoiceNumber,
    companyName: company.name,
    daysOverdue,
    amountDue: totalAmount,
    currency: invoice.currency,
    dueDate: dueDateStr,
    viewUrl,
    paymentMethods,
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
  const subject = "Welcome to IE Manager - Your Login Credentials";
  const html = welcomeEmailTemplate({
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
    text: `Hello ${name},\n\nYour IE Manager account has been created.\n\nEmail: ${to}\nTemporary password: ${temporaryPassword}\n\nLog in at: ${loginUrl}\n\nBest regards,\n${COMPANY_NAME}`,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  temporaryPassword: string;
  loginUrl: string;
}): Promise<void> {
  const { to, name, temporaryPassword, loginUrl } = params;
  const subject = "IE Manager - Password Reset";
  const html = passwordResetEmailTemplate({ name, temporaryPassword, loginUrl });
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: getFrom(),
    to,
    subject,
    html,
    text: `Hello ${name},\n\nYour password has been reset. New temporary password: ${temporaryPassword}\n\nLog in at: ${loginUrl}\n\nBest regards,\n${COMPANY_NAME}`,
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
  const html = monthlyReportEmailTemplate({ month, year, summaryHtml, reportUrl });
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
  const html = statementEmailTemplate({ companyName: company.name, viewUrl });
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