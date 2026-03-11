"use client";

import * as React from "react";
import { Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { cn } from "@/lib/utils";

export interface FilterBarProps {
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (value: string) => void;
  onDateToChange?: (value: string) => void;
  statusOptions?: { value: string; label: string }[];
  statusValue?: string;
  onStatusChange?: (value: string) => void;
  onClear?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function FilterBar({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  statusOptions = [],
  statusValue,
  onStatusChange,
  onClear,
  className,
  children,
}: FilterBarProps) {
  const hasFilters =
    dateFrom ||
    dateTo ||
    (statusValue && statusValue !== "all") ||
    React.Children.count(children) > 0;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3",
        className
      )}
    >
      {(onDateFromChange || onDateToChange) && (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFrom ?? ""}
            onChange={(e) => onDateFromChange?.(e.target.value)}
            className="h-9 w-[140px]"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            value={dateTo ?? ""}
            onChange={(e) => onDateToChange?.(e.target.value)}
            className="h-9 w-[140px]"
          />
        </div>
      )}
      {statusOptions.length > 0 && onStatusChange && (
        <Select
          value={statusValue ?? "all"}
          onValueChange={onStatusChange}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {children}
      {hasFilters && onClear && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
