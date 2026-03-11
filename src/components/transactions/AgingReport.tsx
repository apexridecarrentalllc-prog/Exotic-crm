"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { formatCurrency } from "@/lib/invoice-constants";

export interface AgingCompanyRow {
  companyId: string;
  companyName: string;
  current: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
}

export interface AgingTotals {
  current: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
}

export interface AgingReportProps {
  companies: AgingCompanyRow[];
  totals: AgingTotals;
  currency?: string;
  loading?: boolean;
}

export function AgingReport({
  companies,
  totals,
  currency = "PKR",
  loading,
}: AgingReportProps) {
  if (loading) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        Loading aging report...
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        No aging data
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead className="text-right text-emerald-600 dark:text-emerald-400">Current (0-30)</TableHead>
            <TableHead className="text-right text-yellow-600 dark:text-yellow-400">31-60 Days</TableHead>
            <TableHead className="text-right text-orange-600 dark:text-orange-400">61-90 Days</TableHead>
            <TableHead className="text-right text-destructive">90+ Days</TableHead>
            <TableHead className="text-right font-medium">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((c) => (
            <TableRow key={c.companyId}>
              <TableCell className="font-medium">{c.companyName}</TableCell>
              <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatCurrency(c.current, currency)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-yellow-600 dark:text-yellow-400">
                {formatCurrency(c.days31to60, currency)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-orange-600 dark:text-orange-400">
                {formatCurrency(c.days61to90, currency)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-destructive">
                {formatCurrency(c.over90, currency)}
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {formatCurrency(c.total, currency)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/30 font-semibold">
            <TableCell>Total</TableCell>
            <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.current, currency)}</TableCell>
            <TableCell className="text-right text-yellow-600 dark:text-yellow-400">{formatCurrency(totals.days31to60, currency)}</TableCell>
            <TableCell className="text-right text-orange-600 dark:text-orange-400">{formatCurrency(totals.days61to90, currency)}</TableCell>
            <TableCell className="text-right text-destructive">{formatCurrency(totals.over90, currency)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.total, currency)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
