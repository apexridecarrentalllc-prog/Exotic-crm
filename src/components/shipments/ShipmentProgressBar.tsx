"use client";

import * as React from "react";
import { SHIPMENT_STATUS_ORDER, getStatusLabel } from "@/lib/shipment-constants";
import type { ShipmentStatus } from "@prisma/client";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ShipmentProgressBarProps {
  currentStatus: ShipmentStatus;
  onStepClick?: (status: ShipmentStatus) => void;
  className?: string;
}

export function ShipmentProgressBar({
  currentStatus,
  onStepClick,
  className,
}: ShipmentProgressBarProps) {
  const currentIndex = SHIPMENT_STATUS_ORDER.indexOf(currentStatus);
  const isCancelled = currentStatus === "CANCELLED";

  return (
    <div className={cn("w-full overflow-x-auto py-2", className)}>
      <div className="flex min-w-max items-center gap-0">
        {SHIPMENT_STATUS_ORDER.map((status, index) => {
          const isCompleted = !isCancelled && index < currentIndex;
          const isCurrent = !isCancelled && index === currentIndex;
          const isClickable =
            onStepClick &&
            !isCancelled &&
            (index === currentIndex || index === currentIndex + 1);
          const label = getStatusLabel(status);

          return (
            <React.Fragment key={status}>
              <button
                type="button"
                onClick={() => isClickable && onStepClick(status)}
                disabled={!isClickable}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md px-2 py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  isClickable && "cursor-pointer hover:bg-muted/80",
                  !isClickable && "cursor-default"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium transition-all",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    isCurrent &&
                      "border-primary bg-primary/20 text-primary animate-pulse",
                    !isCompleted &&
                      !isCurrent &&
                      "border-muted-foreground/30 bg-muted/30 text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "max-w-[4rem] truncate text-center text-xs",
                    isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label.replace(/\s+/g, " ")}
                </span>
              </button>
              {index < SHIPMENT_STATUS_ORDER.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-4 shrink-0 rounded sm:w-6",
                    index < currentIndex && !isCancelled
                      ? "bg-primary"
                      : "bg-muted"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
