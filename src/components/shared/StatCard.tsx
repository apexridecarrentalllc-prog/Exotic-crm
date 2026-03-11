import * as React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const colorVariants = {
  blue: "text-blue-600 dark:text-blue-400",
  green: "text-emerald-600 dark:text-emerald-400",
  yellow: "text-amber-600 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
  purple: "text-violet-600 dark:text-violet-400",
};

const iconBgVariants = {
  blue: "bg-blue-500/10",
  green: "bg-emerald-500/10",
  yellow: "bg-amber-500/10",
  red: "bg-red-500/10",
  purple: "bg-violet-500/10",
};

export type StatCardColor = keyof typeof colorVariants;

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: StatCardColor;
  change?: number;
  changeLabel?: string;
  subtitle?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  color = "blue",
  change,
  changeLabel,
  subtitle,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            iconBgVariants[color],
            colorVariants[color]
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {(change !== undefined || subtitle) && (
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {change !== undefined && (
              <span
                className={cn(
                  "flex items-center gap-0.5 font-medium",
                  change >= 0 ? "text-emerald-600" : "text-red-600"
                )}
              >
                {change >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(change)}%
              </span>
            )}
            {changeLabel && <span>{changeLabel}</span>}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
