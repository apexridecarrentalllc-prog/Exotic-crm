"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, AlertTriangle, FileWarning, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export interface AlertsPanelProps {
  overdueCount: number;
  pendingDocumentsCount: number;
  stuckShipmentsCount?: number;
}

export function AlertsPanel({
  overdueCount,
  pendingDocumentsCount,
  stuckShipmentsCount = 0,
}: AlertsPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const total = overdueCount + pendingDocumentsCount + stuckShipmentsCount;

  if (total === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-between text-left"
        >
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Alerts & Action Center
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-sm font-medium text-amber-700 dark:text-amber-400">
              {total}
            </span>
          </CardTitle>
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      {!collapsed && (
        <CardContent className="pt-0">
          <ul className="space-y-2 text-sm">
            {overdueCount > 0 && (
              <li className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <FileWarning className="h-4 w-4 text-red-500" />
                  {overdueCount} overdue invoice{overdueCount !== 1 ? "s" : ""}
                </span>
                <Link href="/invoices?status=OVERDUE" className="text-sm font-medium text-primary hover:underline">
                  View all
                </Link>
              </li>
            )}
            {pendingDocumentsCount > 0 && (
              <li className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <FileWarning className="h-4 w-4 text-amber-500" />
                  {pendingDocumentsCount} shipment{pendingDocumentsCount !== 1 ? "s" : ""} missing documents
                </span>
                <Link href="/documents" className="text-sm font-medium text-primary hover:underline">
                  View all
                </Link>
              </li>
            )}
            {stuckShipmentsCount > 0 && (
              <li className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-500" />
                  {stuckShipmentsCount} shipment{stuckShipmentsCount !== 1 ? "s" : ""} need attention
                </span>
                <Link href="/shipments" className="text-sm font-medium text-primary hover:underline">
                  View all
                </Link>
              </li>
            )}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
