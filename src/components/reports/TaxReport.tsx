"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatCurrency } from "@/lib/invoice-constants";

export interface TaxReportItem {
  period: string;
  invoiceNumber: string;
  companyName: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  withholdingTax: number;
  netAmount: number;
}

export interface TaxReportProps {
  items: TaxReportItem[];
  totals: { totalTax: number; totalWHT: number };
  currency?: string;
  loading?: boolean;
}

export function TaxReport(props: TaxReportProps) {
  const { items, totals, currency = "PKR", loading } = props;
  if (loading) return <div className="rounded-md border p-8 text-center text-muted-foreground">Loading report...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Tax Charged</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(totals.totalTax, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total WHT Deducted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(totals.totalWHT, currency)}</p>
          </CardContent>
        </Card>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">Tax Rate %</TableHead>
              <TableHead className="text-right">Tax Amount</TableHead>
              <TableHead className="text-right">WHT</TableHead>
              <TableHead className="text-right">Net Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row, i) => (
              <TableRow key={i}>
                <TableCell>{row.period}</TableCell>
                <TableCell>{row.invoiceNumber}</TableCell>
                <TableCell>{row.companyName}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(row.subtotal, currency)}</TableCell>
                <TableCell className="text-right">{row.taxRate}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(row.taxAmount, currency)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(row.withholdingTax, currency)}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatCurrency(row.netAmount, currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {items.length === 0 && !loading && <p className="text-center text-muted-foreground">No taxable invoices in period.</p>}
    </div>
  );
}
