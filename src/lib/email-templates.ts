/**
 * Email HTML templates. Table-based layout + inline CSS for email client compatibility.
 * All templates are mobile-responsive (max-width, fluid tables).
 */

/** Used when a template is rendered without a company name (normally email.ts passes the one from Settings). */
export const DEFAULT_BRAND_NAME =
  process.env.NEXT_PUBLIC_COMPANY_NAME ?? process.env.NEXT_PUBLIC_APP_NAME ?? process.env.SMTP_FROM_NAME ?? "PISTIS";
const HEADER_BG = "#3F730A";
const HEADER_TEXT = "#FFFFFF";
const BODY_BG = "#FFFFFF";
const TEXT = "#333333";
const MUTED = "#6b7280";
const LINK = "#3F730A";
const BORDER = "#e5e7eb";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Amounts in emails read the same as on the PDF, for example 5,001.00. */
export function formatEmailAmount(value: number | string): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function wrapDocument(content: string, brandName?: string): string {
  const COMPANY_NAME = escapeHtml(brandName?.trim() || DEFAULT_BRAND_NAME);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${COMPANY_NAME}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;background-color:${BODY_BG};color:${TEXT};font-size:16px;line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BODY_BG};">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
          <tr>
            <td style="background-color:${HEADER_BG};color:${HEADER_TEXT};padding:20px 24px;border-radius:8px 8px 0 0;">
              <h1 style="margin:0;font-size:20px;font-weight:600;">${COMPANY_NAME}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;border:1px solid ${BORDER};border-top:none;border-radius:0 0 8px 8px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;text-align:center;color:${MUTED};font-size:12px;border:1px solid ${BORDER};border-top:none;">
              This is an automated message from ${COMPANY_NAME}. Please do not reply directly to this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface InvoiceEmailData {
  /** Company name shown in the header and sign-off. Defaults to the PISTIS fallback. */
  brandName?: string;
  invoiceNumber: string;
  shipmentRef: string;
  dueDate: string;
  totalAmount: string;
  currency: string;
  viewUrl: string;
  paymentInstructions?: string;
  /** Greets the client by name. Without it the greeting is "Dear Customer". */
  recipientName?: string;
}

export function invoiceEmailTemplate(data: InvoiceEmailData): string {
  const content = `
    <p style="margin:0 0 16px;">Dear ${data.recipientName?.trim() ? escapeHtml(data.recipientName.trim()) : "Customer"},</p>
    <p style="margin:0 0 20px;">Please find your invoice attached and a summary below.</p>
    <table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;border:1px solid ${BORDER};margin-bottom:20px;">
      <tr style="background-color:#f9fafb;">
        <td style="border:1px solid ${BORDER};font-weight:600;">Invoice</td>
        <td style="border:1px solid ${BORDER};">${data.invoiceNumber}</td>
      </tr>
      <tr>
        <td style="border:1px solid ${BORDER};font-weight:600;">Shipment</td>
        <td style="border:1px solid ${BORDER};">${data.shipmentRef}</td>
      </tr>
      <tr>
        <td style="border:1px solid ${BORDER};font-weight:600;">Amount Due</td>
        <td style="border:1px solid ${BORDER};font-weight:600;">${data.currency} ${data.totalAmount}</td>
      </tr>
    </table>
    <p style="margin:0 0 12px;">
      <a href="${data.viewUrl}" style="color:${LINK};text-decoration:underline;">View invoice online</a>
    </p>
    ${data.paymentInstructions ? `<p style="margin:16px 0 0;padding:12px;background:#f0f9ff;border-radius:6px;font-size:14px;">${data.paymentInstructions}</p>` : ""}
    <p style="margin:24px 0 0;">Thank you for your business.</p>
  `;
  return wrapDocument(content, data.brandName);
}

export interface PaymentReminderData {
  /** Company name shown in the header and sign-off. Defaults to the PISTIS fallback. */
  brandName?: string;
  invoiceNumber: string;
  companyName: string;
  daysOverdue: number;
  amountDue: string;
  currency: string;
  dueDate: string;
  viewUrl: string;
  paymentMethods?: string;
}

export function paymentReminderTemplate(data: PaymentReminderData): string {
  const content = `
    <p style="margin:0 0 16px;">Dear ${data.companyName},</p>
    <p style="margin:0 0 20px;">This is a friendly reminder that the following invoice is <strong>${data.daysOverdue} day(s) overdue</strong>.</p>
    <table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;border:1px solid ${BORDER};margin-bottom:20px;">
      <tr style="background-color:#fef2f2;">
        <td style="border:1px solid ${BORDER};font-weight:600;">Invoice</td>
        <td style="border:1px solid ${BORDER};">${data.invoiceNumber}</td>
      </tr>
      <tr>
        <td style="border:1px solid ${BORDER};font-weight:600;">Due Date</td>
        <td style="border:1px solid ${BORDER};">${data.dueDate}</td>
      </tr>
      <tr style="background-color:#fef2f2;">
        <td style="border:1px solid ${BORDER};font-weight:600;">Amount Due</td>
        <td style="border:1px solid ${BORDER};font-weight:600;">${data.currency} ${data.amountDue}</td>
      </tr>
    </table>
    <p style="margin:0 0 12px;">Please arrange payment at your earliest convenience.</p>
    <p style="margin:0 0 12px;"><a href="${data.viewUrl}" style="color:${LINK};text-decoration:underline;">View invoice details</a></p>
    ${data.paymentMethods ? `<p style="margin:16px 0 0;font-size:14px;color:${MUTED};">${data.paymentMethods}</p>` : ""}
    <p style="margin:24px 0 0;">Thank you.</p>
  `;
  return wrapDocument(content, data.brandName);
}

export interface WelcomeEmailData {
  /** Company name shown in the header and sign-off. Defaults to the PISTIS fallback. */
  brandName?: string;
  name: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
  forcePasswordChange?: boolean;
}

export function welcomeEmailTemplate(data: WelcomeEmailData): string {
  const tip = data.forcePasswordChange
    ? "Please log in and change your password immediately."
    : "We recommend changing your password after your first login.";
  const content = `
    <p style="margin:0 0 16px;">Hello ${data.name},</p>
    <p style="margin:0 0 20px;">Your account has been created. Use the credentials below to sign in.</p>
    <table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;border:1px solid ${BORDER};margin-bottom:20px;">
      <tr style="background-color:#f9fafb;">
        <td style="border:1px solid ${BORDER};font-weight:600;">Email</td>
        <td style="border:1px solid ${BORDER};">${data.email}</td>
      </tr>
      <tr>
        <td style="border:1px solid ${BORDER};font-weight:600;">Temporary password</td>
        <td style="border:1px solid ${BORDER};font-family:monospace;">${data.temporaryPassword}</td>
      </tr>
    </table>
    <p style="margin:0 0 16px;"><a href="${data.loginUrl}" style="display:inline-block;background:${HEADER_BG};color:${HEADER_TEXT};padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Log in</a></p>
    <p style="margin:16px 0 0;font-size:14px;color:${MUTED};">${tip}</p>
    <p style="margin:24px 0 0;">Welcome to the team.</p>
  `;
  return wrapDocument(content, data.brandName);
}

export interface PasswordResetEmailData {
  /** Company name shown in the header and sign-off. Defaults to the PISTIS fallback. */
  brandName?: string;
  name: string;
  temporaryPassword: string;
  loginUrl: string;
}

export function passwordResetEmailTemplate(data: PasswordResetEmailData): string {
  const content = `
    <p style="margin:0 0 16px;">Hello ${data.name},</p>
    <p style="margin:0 0 20px;">Your password has been reset by an administrator. Use the temporary password below to log in, then set a new password.</p>
    <table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;border:1px solid ${BORDER};margin-bottom:20px;">
      <tr>
        <td style="border:1px solid ${BORDER};font-weight:600;">Temporary password</td>
        <td style="border:1px solid ${BORDER};font-family:monospace;">${data.temporaryPassword}</td>
      </tr>
    </table>
    <p style="margin:0 0 16px;"><a href="${data.loginUrl}" style="display:inline-block;background:${HEADER_BG};color:${HEADER_TEXT};padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Log in</a></p>
    <p style="margin:24px 0 0;">Best regards,<br/>${escapeHtml(data.brandName?.trim() || DEFAULT_BRAND_NAME)}</p>
  `;
  return wrapDocument(content, data.brandName);
}

export interface MonthlyReportEmailData {
  /** Company name shown in the header and sign-off. Defaults to the PISTIS fallback. */
  brandName?: string;
  month: string;
  year: string;
  summaryHtml: string;
  reportUrl: string;
}

export function monthlyReportEmailTemplate(data: MonthlyReportEmailData): string {
  const content = `
    <p style="margin:0 0 16px;">Please find your monthly business report for <strong>${data.month} ${data.year}</strong> attached.</p>
    <div style="margin:20px 0;padding:16px;background:#f9fafb;border-radius:6px;font-size:14px;">
      ${data.summaryHtml}
    </div>
    <p style="margin:0 0 16px;"><a href="${data.reportUrl}" style="color:${LINK};text-decoration:underline;">View full report online</a></p>
    <p style="margin:24px 0 0;">Best regards,<br/>${escapeHtml(data.brandName?.trim() || DEFAULT_BRAND_NAME)}</p>
  `;
  return wrapDocument(content, data.brandName);
}

export interface StatementEmailData {
  /** Company name shown in the header and sign-off. Defaults to the PISTIS fallback. */
  brandName?: string;
  companyName: string;
  viewUrl?: string;
}

export function statementEmailTemplate(data: StatementEmailData): string {
  const content = `
    <p style="margin:0 0 16px;">Dear ${data.companyName},</p>
    <p style="margin:0 0 20px;">Please find your statement of account attached.</p>
    ${data.viewUrl ? `<p style="margin:0 0 16px;"><a href="${data.viewUrl}" style="color:${LINK};text-decoration:underline;">View statement online</a></p>` : ""}
    <p style="margin:24px 0 0;">If you have any questions, please contact us.</p>
  `;
  return wrapDocument(content, data.brandName);
}
