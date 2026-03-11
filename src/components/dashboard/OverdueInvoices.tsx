"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { differenceInDays } from "date-fns";

export interface OverdueInvoiceRow {
  id: string;
  invoiceNumber: string;
  companyName: string;
  balanceAmount: number;
  currency: string;
  dueDate: string;
}

const formatter = new Intl.NumberFormat("en-PK", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function OverdueInvoices({
  data,
  loading,
}: {
  data: OverdueInvoiceRow[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Overdue Invoices</CardTitle>
        <Link
          href="/invoices?status=OVERDUE"
          className="text-sm font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Invoice #</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="text-red-600">Days overdue</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No overdue invoices
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => {
                const daysOverdue = differenceInDays(new Date(), new Date(row.dueDate));
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <Link href={`/invoices/${row.id}`} className="hover:underline">
                        {row.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate">{row.companyName}</TableCell>
                    <TableCell>
                      {formatter.format(row.balanceAmount)} {row.currency}
                    </TableCell>
                    <TableCell className="text-red-600 font-medium">
                      {daysOverdue} days
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/invoices/${row.id}`}
                        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                      >
                        Action
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
