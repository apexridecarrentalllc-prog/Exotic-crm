export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

export const INVOICE_STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "destructive" | "outline"> = {
  DRAFT: "outline",
  SENT: "default",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERDUE: "destructive",
  CANCELLED: "destructive",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  CASH: "Cash",
  ONLINE: "Online",
};

/** Common service descriptions for line item autocomplete */
export const COMMON_SERVICE_DESCRIPTIONS = [
  "Port Clearance Fee",
  "Transportation Fee",
  "Handling Fee",
  "Storage Fee",
  "Documentation Fee",
  "Customs Duty",
  "Inspection Fee",
  "Consultancy Fee",
] as const;

/** Format number as currency with commas and 2 decimals */
export function formatCurrency(amount: number, currency: string = "PKR"): string {
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Parse payment terms string to days offset (e.g. "Net 30" -> 30) */
export function paymentTermsToDays(terms: string | null | undefined): number {
  if (!terms) return 0;
  const m = terms.match(/Net\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : 0;
}
