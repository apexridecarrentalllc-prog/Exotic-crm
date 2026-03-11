"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/invoice-constants";

export interface YTDSummaryData {
  year: number;
  totalShipments: number;
  importShipments: number;
  exportShipments: number;
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  topCompanies: Array< { companyId: string; companyName: string; totalInvoiced: number }>;
}

export interface YTDSummaryProps {
  data: YTDSummaryData | null;
  currency?: string;
  loading?: boolean;
}

export function YTDSummary({ data, currency = "PKR", loading }: YTDSummaryProps) {
  if (loading) return <div className="rounded-md border p-8 text-center text-muted-foreground">Loading report...</div>;
  if (!data) return <p className="text-center text-muted-foreground">Select year and generate report.</p>;

  const barData = data.topCompanies.map((c) => ({
    name: c.companyName.length > 12 ? c.companyName.slice(0, 12) + "..." : c.companyName,
    Invoiced: c.totalInvoiced,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{data.totalShipments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(data.totalInvoiced, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-600">{formatCurrency(data.totalCollected, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-destructive">{formatCurrency(data.totalOutstanding, currency)}</p>
          </CardContent>
        </Card>
      </div>
      <p className="text-sm text-muted-foreground">
        Year {data.year}: Import {data.importShipments} | Export {data.exportShipments}
      </p>
      {barData.length > 0 && (
        <div className="h-64 w-full rounded-lg border p-4">
          <p className="mb-2 text-sm font-medium">Top 5 companies by invoiced amount</p>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number | undefined) => value != null ? formatCurrency(value, currency) : ""} />
              <Bar dataKey="Invoiced" fill="#3F730A" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
