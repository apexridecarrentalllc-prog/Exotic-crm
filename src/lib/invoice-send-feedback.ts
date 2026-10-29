import toast from "react-hot-toast";

/** What the send endpoints report about the email part of "send invoice". */
export type SendEmailResult = {
  /** True when an email was actually tried (there was a recipient and email is set up). */
  attempted: boolean;
  /** True only when the email server accepted the message. */
  sent: boolean;
  recipient?: string;
  /** Plain-English reason when the email was not sent. */
  error?: string;
  /** True when the invoice was already sent before and this was an extra send. */
  resend?: boolean;
};

/**
 * Tells the user what really happened. The invoice itself is marked as sent either way,
 * so a failed email must be shown clearly instead of a plain "Invoice sent".
 */
export function showSendFeedback(email: SendEmailResult | undefined): void {
  if (!email) {
    toast.success("Invoice sent");
    return;
  }
  if (email.sent) {
    toast.success(email.recipient ? `Invoice emailed to ${email.recipient}` : "Invoice emailed");
    return;
  }
  const lead = email.resend ? "The email was not sent" : "Invoice marked as sent, but the email was not sent";
  if (!email.attempted) {
    toast(`${lead}. ${email.error ?? ""}`.trim(), { icon: "⚠️", duration: 9000 });
    return;
  }
  toast.error(`${lead}: ${email.error ?? "unknown error"} Click "Send invoice" to try again.`, { duration: 10000 });
}
