"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Receipt, CreditCard, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CompanyFinancialSummaryProps {
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  currency: string;
  className?: string;
}

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function CompanyFinancialSummary({
  totalInvoiced,
  totalPaid,
  outstanding,
  currency,
  className,
}: CompanyFinancialSummaryProps) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-3", className)}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <span className="text-sm font-medium text-muted-foreground">Total Invoiced</span>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{formatAmount(totalInvoiced, currency)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <span className="text-sm font-medium text-muted-foreground">Total Paid</span>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {formatAmount(totalPaid, currency)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <span className="text-sm font-medium text-muted-foreground">Outstanding</span>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "text-2xl font-semibold",
              outstanding > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {formatAmount(outstanding, currency)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
