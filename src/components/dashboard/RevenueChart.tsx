"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export interface MonthlyRevenuePoint {
  month: string;
  invoiced: number;
  collected: number;
}

export function RevenueChart({
  data,
  loading,
}: {
  data: MonthlyRevenuePoint[];
  loading?: boolean;
}) {
  const chartData = data.map((d) => ({
    ...d,
    monthLabel: new Date(d.month + "-01").toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    }),
  }));

  if (loading) {
    return (
      <Card className="h-[320px]">
        <CardHeader>
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-[240px] w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Revenue Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                formatter={(value: unknown) => [String(Number(value ?? 0).toLocaleString()), ""]}
                labelFormatter={(_, payload) =>
                  (payload?.[0] as { payload?: { monthLabel?: string } })?.payload?.monthLabel ?? ""
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="invoiced"
                name="Invoiced"
                stroke="hsl(243 75% 59%)"
                strokeWidth={2}
                dot={{ fill: "hsl(243 75% 59%)" }}
              />
              <Line
                type="monotone"
                dataKey="collected"
                name="Collected"
                stroke="hsl(142 76% 36%)"
                strokeWidth={2}
                dot={{ fill: "hsl(142 76% 36%)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
