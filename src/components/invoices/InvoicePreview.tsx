"use client";

import { formatCurrency } from "@/lib/invoice-constants";
import type { LineItemRow } from "./InvoiceLineItemsEditor";

export interface InvoicePreviewProps {
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  currency?: string;
  companyName?: string;
  companyAddress?: string;
  shipmentReference?: string;
  lineItems: LineItemRow[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  withholdingTax: number;
  totalAmount: number;
  isPreview?: boolean;
  className?: string;
}

export function InvoicePreview({
  invoiceNumber = "—",
  issueDate,
  dueDate,
  currency = "PKR",
  companyName,
  companyAddress,
  shipmentReference,
  lineItems,
  subtotal,
  taxRate,
  taxAmount,
  withholdingTax,
  totalAmount,
  isPreview = true,
  className = "",
}: InvoicePreviewProps) {
  const formatDate = (d: string | undefined) =>
    d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

  return (
    <div className={`rounded-lg border bg-card text-sm ${className}`}>
      {isPreview && (
        <p className="text-xs text-muted-foreground px-4 pt-2 border-b pb-2">This is a preview</p>
      )}
      <div className="p-4 space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-lg font-semibold">Invoice</h3>
          <div className="grid grid-cols-2 gap-x-4 mt-2 text-muted-foreground">
            <span>Invoice #</span>
            <span className="font-medium text-foreground">{invoiceNumber}</span>
            <span>Date</span>
            <span>{formatDate(issueDate)}</span>
            <span>Due date</span>
            <span>{formatDate(dueDate)}</span>
            {shipmentReference && (
              <>
                <span>Shipment</span>
                <span>{shipmentReference}</span>
              </>
            )}
          </div>
        </div>

        {companyName && (
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Bill to</p>
            <p className="font-medium">{companyName}</p>
            {companyAddress && <p className="text-muted-foreground text-xs mt-0.5">{companyAddress}</p>}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Description</th>
                <th className="text-right py-2 w-16">Qty</th>
                <th className="text-right py-2 w-24">Rate</th>
                <th className="text-right py-2 w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((row, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{row.description || "—"}</td>
                  <td className="text-right tabular-nums">{row.quantity}</td>
                  <td className="text-right tabular-nums">{formatCurrency(row.unitRate, currency)}</td>
                  <td className="text-right tabular-nums">
                    {formatCurrency(row.quantity * row.unitRate, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto w-48 space-y-1 border-t pt-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax ({taxRate}%)</span>
            <span>{formatCurrency(taxAmount, currency)}</span>
          </div>
          {withholdingTax > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Withholding</span>
              <span>-{formatCurrency(withholdingTax, currency)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold pt-1">
            <span>Total</span>
            <span>{formatCurrency(totalAmount, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
