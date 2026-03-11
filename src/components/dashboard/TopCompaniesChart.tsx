"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const formatter = new Intl.NumberFormat("en-PK", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export interface TopCompanyRow {
  companyId: string;
  companyName: string;
  totalInvoiced: number;
}

export function TopCompaniesChart({
  data,
  loading,
}: {
  data: TopCompanyRow[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxAmount = Math.max(...data.map((d) => d.totalInvoiced), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Companies by Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
        ) : (
          <div className="space-y-4">
            {data.map((row, i) => (
              <div key={row.companyId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <Link
                    href={`/companies/${row.companyId}`}
                    className="font-medium hover:underline truncate max-w-[180px]"
                  >
                    {i + 1}. {row.companyName}
                  </Link>
                  <span className="text-muted-foreground shrink-0">
                    {formatter.format(row.totalInvoiced)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/70 transition-all"
                    style={{ width: `${(row.totalInvoiced / maxAmount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
