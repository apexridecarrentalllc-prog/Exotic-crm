"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DownloadExportButton } from "@/components/shared/DownloadExportButton";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LedgerEntry {
  date: string;
  type: "invoice" | "payment";
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface CompanyLedgerProps {
  companyId?: string;
  companyName: string;
  currency: string;
  entries: LedgerEntry[];
  closingBalance: number;
  fromDate: string | null;
  toDate: string | null;
  loading?: boolean;
  onDateRangeChange?: (from: string, to: string) => void;
  /** URL for Excel export (transactions/export with companyId and dates). If not set, onExportExcel is used. */
  exportUrl?: string;
  /** URL for statement PDF download. If set, shows "Download statement PDF" button. */
  statementPdfUrl?: string;
  onExportExcel?: () => void;
}

function formatMoney(amount: number, currency: string): string {
  if (amount === 0) return "—";
  return `${currency} ${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CompanyLedger({
  companyName,
  currency,
  entries,
  closingBalance,
  fromDate,
  toDate,
  loading = false,
  onDateRangeChange,
  exportUrl,
  statementPdfUrl,
  onExportExcel,
}: CompanyLedgerProps) {
  const [from, setFrom] = React.useState(fromDate ?? "");
  const [to, setTo] = React.useState(toDate ?? "");

  React.useEffect(() => {
    setFrom(fromDate ?? "");
    setTo(toDate ?? "");
  }, [fromDate, toDate]);

  const handleApply = () => {
    onDateRangeChange?.(from, to);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Ledger — {companyName}</CardTitle>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="ledger-from" className="text-xs whitespace-nowrap">From</Label>
              <Input
                id="ledger-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 w-[140px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="ledger-to" className="text-xs whitespace-nowrap">To</Label>
              <Input
                id="ledger-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 w-[140px]"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleApply}>
              Apply
            </Button>
            {exportUrl && (
              <DownloadExportButton type="excel" downloadUrl={exportUrl} />
            )}
            {statementPdfUrl && (
              <DownloadExportButton type="pdf" label="Download statement PDF" downloadUrl={statementPdfUrl} />
            )}
            {!exportUrl && !statementPdfUrl && onExportExcel && (
              <Button variant="outline" size="sm" onClick={onExportExcel}>
                Export to Excel
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((row, i) => (
                    <TableRow key={`${row.date}-${row.reference}-${i}`}>
                      <TableCell className="whitespace-nowrap">{row.date}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded",
                            row.type === "invoice"
                              ? "bg-primary/10 text-primary"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          )}
                        >
                          {row.type === "invoice" ? "Invoice" : "Payment"}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{row.reference}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.debit > 0 ? formatMoney(row.debit, currency) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.credit > 0 ? formatMoney(row.credit, currency) : "—"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums font-medium",
                          row.balance >= 0 ? "text-foreground" : "text-destructive"
                        )}
                      >
                        {formatMoney(row.balance, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end border-t pt-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Closing Balance</span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    closingBalance >= 0 ? "text-foreground" : "text-destructive"
                  )}
                >
                  {formatMoney(closingBalance, currency)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
