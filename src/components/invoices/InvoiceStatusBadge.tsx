"use client";

import { Badge } from "@/components/ui/Badge";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_VARIANT } from "@/lib/invoice-constants";

export interface InvoiceStatusBadgeProps {
  status: string;
  className?: string;
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const variant = INVOICE_STATUS_VARIANT[status] ?? "outline";
  const label = INVOICE_STATUS_LABELS[status] ?? status;
  return <Badge variant={variant} className={className}>{label}</Badge>;
}
