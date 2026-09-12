"use client";

import { formatAmount } from "@/lib/invoice-constants";

export interface InvoiceTotalsProps {
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  withholdingTax?: number;
  totalAmount: number;
  currency?: string;
  className?: string;
}

export function InvoiceTotals({
  totalAmount,
  className = "",
}: InvoiceTotalsProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between border-t pt-2 font-semibold">
        <span>Total</span>
        <span>{formatAmount(totalAmount)}</span>
      </div>
    </div>
  );
}
