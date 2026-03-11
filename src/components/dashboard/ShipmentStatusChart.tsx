"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const STATUS_COLORS = [
  "#3F730A",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(280 67% 47%)",
  "hsl(199 89% 48%)",
  "hsl(24 95% 53%)",
];

export interface ShipmentStatusPoint {
  status: string;
  count: number;
}

function formatStatus(s: string): string {
  return s.replace(/_/g, " ");
}

export function ShipmentStatusChart({
  data,
  loading,
}: {
  data: ShipmentStatusPoint[];
  loading?: boolean;
}) {
  const chartData = data.map((d, i) => ({
    name: formatStatus(d.status),
    value: d.count,
    color: STATUS_COLORS[i % STATUS_COLORS.length],
  }));

  if (loading) {
    return (
      <Card className="h-[320px]">
        <CardHeader>
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-[240px] w-full animate-pulse rounded-full bg-muted mx-auto max-w-[240px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipments by Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                formatter={(value: unknown) => [Number(value ?? 0), "Count"]}
              />
              <Legend formatter={(v) => formatStatus(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
