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

export interface LedgerRow {
  id: string;
  date: string;
  type: string;
  referenceNumber: string;
  description: string;
  companyName: string;
  shipmentRef: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface LedgerTableProps {
  rows: LedgerRow[];
  summary?: { totalDebits: number; totalCredits: number; netBalance: number };
  currency?: string;
  loading?: boolean;
  emptyMessage?: string;
}

export function LedgerTable({
  rows,
  summary,
  currency = "PKR",
  loading,
  emptyMessage = "No transactions",
}: LedgerTableProps) {
  const totalDebits = summary?.totalDebits ?? rows.reduce((s, r) => s + r.debit, 0);
  const totalCredits = summary?.totalCredits ?? rows.reduce((s, r) => s + r.credit, 0);
  const netBalance = summary?.netBalance ?? totalDebits - totalCredits;

  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Shipment</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                Loading...
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Shipment</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
              <TableCell>{row.type}</TableCell>
              <TableCell className="font-medium">{row.referenceNumber}</TableCell>
              <TableCell>{row.description}</TableCell>
              <TableCell>{row.companyName}</TableCell>
              <TableCell>{row.shipmentRef ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">
                {row.debit > 0 ? formatCurrency(row.debit, currency) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                {row.credit > 0 ? formatCurrency(row.credit, currency) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {formatCurrency(row.runningBalance, currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="border-t bg-muted/30 px-4 py-3 flex justify-end gap-8 text-sm font-medium">
        <span>Total Debits: {formatCurrency(totalDebits, currency)}</span>
        <span className="text-emerald-600 dark:text-emerald-400">Total Credits: {formatCurrency(totalCredits, currency)}</span>
        <span>Net Balance: {formatCurrency(netBalance, currency)}</span>
      </div>
    </div>
  );
}
