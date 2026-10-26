"use client";

import { formatAmount } from "@/lib/invoice-constants";
import type { LineItemRow } from "./InvoiceLineItemsEditor";

export interface InvoicePreviewProps {
  invoiceNumber?: string;
  issueDate?: string;
  companyName?: string;
  companyAddress?: string;
  shipmentReference?: string;
  lineItems: LineItemRow[];
  subtotal: number;
  totalAmount: number;
  isPreview?: boolean;
  className?: string;
}

export function InvoicePreview({
  invoiceNumber = "—",
  issueDate,
  companyName,
  companyAddress,
  shipmentReference,
  lineItems,
  totalAmount,
  isPreview = true,
  className = "",
}: InvoicePreviewProps) {
  const formatDate = (d: string | undefined) =>
    d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

  return (
    <div className={`overflow-hidden rounded-lg border border-[#C5D9B4] bg-white text-sm text-[#1F3A0D] ${className}`}>
      {isPreview && (
        <p className="text-xs text-[#3F730A] px-4 pt-2 pb-2 border-b border-[#C5D9B4] bg-[#F4F8F0]">This is a preview</p>
      )}
      <div className="h-1 bg-[#3F730A]" />
      <div className="p-4 space-y-4">
        <div className="border-b border-[#C5D9B4] pb-3">
          <h3 className="text-lg font-semibold tracking-wide text-[#3F730A]">Invoice</h3>
          <div className="grid grid-cols-2 gap-x-4 mt-2 text-[#4B6B38]">
            <span>Invoice #</span>
            <span className="font-medium text-[#1F3A0D]">{invoiceNumber}</span>
            <span>Date</span>
            <span className="text-[#1F3A0D]">{formatDate(issueDate)}</span>
            {shipmentReference && (
              <>
                <span>Shipment</span>
                <span className="text-[#1F3A0D]">{shipmentReference}</span>
              </>
            )}
          </div>
        </div>

        {companyName && (
          <div className="border-l-[3px] border-[#3F730A] bg-[#F4F8F0] px-3 py-2">
            <p className="text-[#3F730A] text-xs uppercase tracking-wide">Bill to</p>
            <p className="font-medium">{companyName}</p>
            {companyAddress && <p className="text-[#4B6B38] text-xs mt-0.5">{companyAddress}</p>}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#3F730A] text-white">
                <th className="text-left py-2 px-2 font-medium">Description</th>
                <th className="text-right py-2 px-2 w-16">Qty</th>
                <th className="text-right py-2 px-2 w-28">Rate (AED)</th>
                <th className="text-right py-2 px-2 w-32">Amount (AED)</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((row, i) => (
                <tr key={i} className={`border-b border-[#C5D9B4] ${i % 2 === 1 ? "bg-[#F4F8F0]" : "bg-white"}`}>
                  <td className="py-2 px-2">{row.description || "—"}</td>
                  <td className="text-right tabular-nums px-2">{row.quantity}</td>
                  <td className="text-right tabular-nums px-2">{formatAmount(row.unitRate)}</td>
                  <td className="text-right tabular-nums px-2">
                    {formatAmount(row.quantity * row.unitRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto w-56">
          <div className="flex justify-between bg-[#3F730A] text-white font-semibold px-3 py-2">
            <span>Total</span>
            <span>AED {formatAmount(totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
