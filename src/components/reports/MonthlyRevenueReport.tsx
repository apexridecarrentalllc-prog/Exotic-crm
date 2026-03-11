"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatCurrency } from "@/lib/invoice-constants";

export interface MonthlyRevenueRow {
  month: number;
  year: number;
  invoiced: number;
  collected: number;
  outstanding: number;
  shipmentCount: number;
}

export interface MonthlyRevenueReportProps {
  data: MonthlyRevenueRow[];
  currency?: string;
  loading?: boolean;
}

export function MonthlyRevenueReport(props: MonthlyRevenueReportProps) {
  const { data, currency = "PKR", loading } = props;
  const chartData = data.map((d) => ({
    name: d.year + "-" + (d.month < 10 ? "0" : "") + d.month,
    Invoiced: d.invoiced,
    Collected: d.collected,
    Outstanding: d.outstanding,
  }));

  if (loading) {
    return <div className="rounded-md border p-8 text-center text-muted-foreground">Loading report...</div>;
  }

  return (
    <div className="space-y-6">
      {chartData.length > 0 && (
        <div className="h-80 w-full rounded-lg border p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
              <Tooltip formatter={(value: number | undefined) => value != null ? formatCurrency(value, currency) : ""} />
              <Legend />
              <Line type="monotone" dataKey="Invoiced" stroke="#3F730A" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Collected" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Outstanding" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Invoiced</TableHead>
              <TableHead className="text-right">Collected</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="text-right">Shipments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={String(row.year) + String(row.month)}>
                <TableCell>{row.year}-{row.month < 10 ? "0" : ""}{row.month}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(row.invoiced, currency)}</TableCell>
                <TableCell className="text-right tabular-nums text-emerald-600">{formatCurrency(row.collected, currency)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(row.outstanding, currency)}</TableCell>
                <TableCell className="text-right">{row.shipmentCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {data.length === 0 && !loading && <p className="text-center text-muted-foreground">No data for the selected period.</p>}
    </div>
  );
}
