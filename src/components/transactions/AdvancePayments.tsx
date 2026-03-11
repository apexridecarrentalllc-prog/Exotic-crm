"use client";

import { formatCurrency, PAYMENT_METHOD_LABELS } from "@/lib/invoice-constants";
import { Badge } from "@/components/ui/Badge";

export interface AdvancePaymentRow {
  id: string;
  companyId: string;
  companyName: string;
  amount: number;
  currency: string;
  paymentDate: string;
  method: string;
  referenceNumber: string | null;
  status: string;
  invoiceNumber: string | null;
}

export interface AdvancePaymentsProps {
  payments: AdvancePaymentRow[];
  onRecordAdvance?: () => void;
  loading?: boolean;
}

export function AdvancePayments({ payments, loading }: AdvancePaymentsProps) {
  if (loading) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        Loading advance payments...
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        No advance payments recorded.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {payments.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4"
          >
            <div>
              <p className="font-medium">{p.companyName}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(p.paymentDate).toLocaleDateString()} · {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                {p.referenceNumber ? ` · ${p.referenceNumber}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(p.amount, p.currency)}
              </span>
              <Badge variant={p.status === "Applied" ? "success" : "outline"}>{p.status}</Badge>
              {p.invoiceNumber && (
                <span className="text-xs text-muted-foreground">Invoice: {p.invoiceNumber}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
