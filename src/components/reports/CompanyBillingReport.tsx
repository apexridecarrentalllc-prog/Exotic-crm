"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { formatCurrency } from "@/lib/invoice-constants";

export interface CompanyBillingRow {
  companyId: string;
  companyName: string;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  invoiceCount: number;
  shipmentCount: number;
  avgPaymentDays: number;
}

export interface CompanyBillingReportProps {
  data: CompanyBillingRow[];
  currency?: string;
  loading?: boolean;
}

type SortKey = "companyName" | "totalInvoiced" | "totalPaid" | "outstanding" | "invoiceCount" | "avgPaymentDays";

export function CompanyBillingReport({ data, currency = "PKR", loading }: CompanyBillingReportProps) {
  const [sortKey, setSortKey] = useState<SortKey>("totalInvoiced");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const cmp = typeof va === "string" ? String(va).localeCompare(String(vb)) : Number(va) - Number(vb);
      return sortAsc ? cmp : -cmp;
    });
  }, [data, sortKey, sortAsc]);

  const chartData = sorted.slice(0, 10).map((c) => ({
    name: c.companyName.length > 15 ? c.companyName.slice(0, 15) + "..." : c.companyName,
    Invoiced: c.totalInvoiced,
    Paid: c.totalPaid,
  }));

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(false); }
  };

  if (loading) {
    return <div className="rounded-md border p-8 text-center text-muted-foreground">Loading report...</div>;
  }

  return (
    <div className="space-y-6">
      {chartData.length > 0 && (
        <div className="h-80 w-full rounded-lg border p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number | undefined) => value != null ? formatCurrency(value, currency) : ""} />
              <Legend />
              <Bar dataKey="Invoiced" fill="#3F730A" name="Invoiced" />
              <Bar dataKey="Paid" fill="#22c55e" name="Paid" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><button type="button" className="font-medium hover:underline" onClick={() => handleSort("companyName")}>Company</button></TableHead>
              <TableHead className="text-right"><button type="button" className="font-medium hover:underline" onClick={() => handleSort("invoiceCount")}># Invoices</button></TableHead>
              <TableHead className="text-right"><button type="button" className="font-medium hover:underline" onClick={() => handleSort("totalInvoiced")}>Total Invoiced</button></TableHead>
              <TableHead className="text-right"><button type="button" className="font-medium hover:underline" onClick={() => handleSort("totalPaid")}>Total Paid</button></TableHead>
              <TableHead className="text-right"><button type="button" className="font-medium hover:underline" onClick={() => handleSort("outstanding")}>Outstanding</button></TableHead>
              <TableHead className="text-right"><button type="button" className="font-medium hover:underline" onClick={() => handleSort("avgPaymentDays")}>Avg Payment Days</button></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => (
              <TableRow key={row.companyId}>
                <TableCell className="font-medium">{row.companyName}</TableCell>
                <TableCell className="text-right">{row.invoiceCount}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(row.totalInvoiced, currency)}</TableCell>
                <TableCell className="text-right tabular-nums text-emerald-600">{formatCurrency(row.totalPaid, currency)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(row.outstanding, currency)}</TableCell>
                <TableCell className="text-right">{row.avgPaymentDays}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {data.length === 0 && !loading && (
        <p className="text-center text-muted-foreground">No data for the selected period.</p>
      )}
    </div>
  );
}
