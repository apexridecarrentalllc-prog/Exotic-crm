"use client";

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

export interface AgingCompanyRow {
  companyId: string;
  companyName: string;
  current: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
}

const COLORS = {
  current: "#3F730A",
  days31to60: "#eab308",
  days61to90: "#f97316",
  over90: "#ef4444",
};

export interface AgingChartProps {
  companies: AgingCompanyRow[];
  currency?: string;
}

export function AgingChart({ companies, currency = "PKR" }: AgingChartProps) {
  const data = companies.slice(0, 15).map((c) => ({
    name: c.companyName.length > 18 ? c.companyName.slice(0, 18) + "…" : c.companyName,
    "0-30 days": c.current,
    "31-60 days": c.days31to60,
    "61-90 days": c.days61to90,
    "90+ days": c.over90,
    total: c.total,
  }));

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center rounded-lg border bg-muted/20 text-muted-foreground">
        No aging data
      </div>
    );
  }

  return (
    <div className="h-80 w-full rounded-lg border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${currency} ${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(value: number | undefined) => [value != null ? value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "", ""]} />
          <Legend />
          <Bar dataKey="0-30 days" stackId="a" fill={COLORS.current} name="Current (0-30)" />
          <Bar dataKey="31-60 days" stackId="a" fill={COLORS.days31to60} name="31-60 Days" />
          <Bar dataKey="61-90 days" stackId="a" fill={COLORS.days61to90} name="61-90 Days" />
          <Bar dataKey="90+ days" stackId="a" fill={COLORS.over90} name="90+ Days" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
