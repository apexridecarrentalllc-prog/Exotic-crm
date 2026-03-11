"use client";

import { formatCurrency, PAYMENT_METHOD_LABELS } from "@/lib/invoice-constants";

export interface PaymentEntry {
  id: string;
  amount: number;
  paymentDate: string;
  method: string;
  referenceNumber?: string | null;
  recordedBy?: { name: string | null } | null;
}

export interface PaymentHistoryProps {
  payments: PaymentEntry[];
  currency?: string;
  className?: string;
}

export function PaymentHistory({ payments, currency = "PKR", className = "" }: PaymentHistoryProps) {
  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No payments yet.</p>;
  }
  return (
    <ul className={"space-y-2 " + className}>
      {payments.map((p) => (
        <li key={p.id} className="flex justify-between rounded-md border px-3 py-2 text-sm">
          <span className="font-medium text-emerald-600">+{formatCurrency(p.amount, currency)}</span>
          <span className="text-muted-foreground">
            {new Date(p.paymentDate).toLocaleDateString()} · {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
            {p.referenceNumber ? " · " + p.referenceNumber : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
