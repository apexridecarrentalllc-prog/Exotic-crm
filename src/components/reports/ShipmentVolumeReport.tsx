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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

const COLORS = ["#3F730A", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

export interface ShipmentVolumeMonth {
  month: number;
  year: number;
  import: number;
  export: number;
  total: number;
}

export interface ShipmentVolumeReportProps {
  months: ShipmentVolumeMonth[];
  byStatus: Array<{ status: string; count: number }>;
  loading?: boolean;
}

export function ShipmentVolumeReport({ months, byStatus, loading }: ShipmentVolumeReportProps) {
  const chartData = months.map((d) => ({
    name: `${d.year}-${String(d.month).padStart(2, "0")}`,
    Import: d.import,
    Export: d.export,
    Total: d.total,
  }));

  const pieData = byStatus.map((s, i) => ({ name: s.status, value: s.count, fill: COLORS[i % COLORS.length] }));

  if (loading) {
    return <div className="rounded-md border p-8 text-center text-muted-foreground">Loading report...</div>;
  }

  return (
    <div className="space-y-6">
      {chartData.length > 0 && (
        <div className="h-80 w-full rounded-lg border p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Import" fill="#3F730A" name="Import" />
              <Bar dataKey="Export" fill="#22c55e" name="Export" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {pieData.length > 0 && (
        <div className="h-64 w-full max-w-sm rounded-lg border p-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(e) => `${e.name}: ${e.value}`}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={pieData[i].fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Import</TableHead>
              <TableHead className="text-right">Export</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {months.map((row) => (
              <TableRow key={`${row.year}-${row.month}`}>
                <TableCell>{row.year}-{String(row.month).padStart(2, "0")}</TableCell>
                <TableCell className="text-right">{row.import}</TableCell>
                <TableCell className="text-right">{row.export}</TableCell>
                <TableCell className="text-right font-medium">{row.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {months.length === 0 && byStatus.length === 0 && !loading && (
        <p className="text-center text-muted-foreground">No data for the selected period.</p>
      )}
    </div>
  );
}
