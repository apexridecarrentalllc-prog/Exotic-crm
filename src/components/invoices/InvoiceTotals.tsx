"use client";

import { formatCurrency } from "@/lib/invoice-constants";

export interface InvoiceTotalsProps {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  withholdingTax: number;
  totalAmount: number;
  currency?: string;
  className?: string;
}

export function InvoiceTotals({
  subtotal,
  taxRate,
  taxAmount,
  withholdingTax,
  totalAmount,
  currency = "PKR",
  className = "",
}: InvoiceTotalsProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{formatCurrency(subtotal, currency)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Tax ({taxRate}%)</span>
        <span>{formatCurrency(taxAmount, currency)}</span>
      </div>
      {withholdingTax > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Withholding Tax</span>
          <span>-{formatCurrency(withholdingTax, currency)}</span>
        </div>
      )}
      <div className="flex justify-between border-t pt-2 font-semibold">
        <span>Net Total</span>
        <span>{formatCurrency(totalAmount, currency)}</span>
      </div>
    </div>
  );
}
