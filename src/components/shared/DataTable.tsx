"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Inbox } from "lucide-react";
import { Pagination, type PaginationState } from "@/components/shared/Pagination";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  accessorKey?: keyof T | string;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

export type { PaginationState };

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: { label: string; onClick: () => void };
  className?: string;
  getRowId?: (row: T) => string;
}

function getValue<T extends Record<string, unknown>>(row: T, key: keyof T | string): unknown {
  const r = row as Record<string, unknown>;
  const k = typeof key === "string" ? key : (key as unknown as string);
  return r[k];
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  emptyMessage = "No data found",
  emptyIcon,
  emptyAction,
  className,
  getRowId,
}: DataTableProps<T>) {
  const isEmpty = !loading && data.length === 0;
  const EmptyIcon = emptyIcon ?? <Inbox className="h-10 w-10 text-muted-foreground" />;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col.id} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <TableCell key={col.id}>
                      <div className="h-5 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading &&
              data.map((row, rowIndex) => (
                <TableRow key={getRowId?.(row) ?? rowIndex}>
                  {columns.map((col) => (
                    <TableCell key={col.id} className={col.className}>
                      {col.cell
                        ? col.cell(row)
                        : String(getValue(row, col.accessorKey ?? col.id) ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 text-muted-foreground">{EmptyIcon}</div>
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            {emptyAction && (
              <Button variant="default" size="sm" className="mt-4" onClick={emptyAction.onClick}>
                {emptyAction.label}
              </Button>
            )}
          </div>
        )}
      </div>

      {pagination && (
        <Pagination
          pagination={pagination}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}
