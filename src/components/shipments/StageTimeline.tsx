"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { STAGE_STATUS_LABELS } from "@/lib/shipment-constants";
import { Check, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StageItem {
  id: string;
  stageName: string;
  stageOrder: number;
  status: string;
  startDate: string | null;
  completedDate: string | null;
  notes: string | null;
  company: { id: string; name: string };
}

export interface StageTimelineProps {
  stages: StageItem[];
  onMarkComplete?: (stageId: string) => void;
  onGenerateInvoice?: (stageId: string, companyId: string) => void;
  className?: string;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

export function StageTimeline({
  stages,
  onMarkComplete,
  onGenerateInvoice,
  className,
}: StageTimelineProps) {
  const sorted = [...stages].sort((a, b) => a.stageOrder - b.stageOrder);

  return (
    <div className={cn("space-y-4", className)}>
      {sorted.map((stage, index) => (
        <div key={stage.id} className="relative flex gap-4">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium",
                stage.status === "COMPLETED" &&
                  "border-primary bg-primary text-primary-foreground",
                stage.status === "IN_PROGRESS" &&
                  "border-primary bg-primary/20 animate-pulse",
                stage.status === "PENDING" &&
                  "border-muted bg-muted text-muted-foreground"
              )}
            >
              {stage.status === "COMPLETED" ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </span>
            {index < sorted.length - 1 && (
              <div className="mt-1 w-0.5 flex-1 bg-border min-h-[24px]" />
            )}
          </div>
          <Card className="flex-1">
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="font-medium">{stage.stageName}</h4>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    {stage.company.name}
                  </div>
                </div>
                <Badge variant="outline">
                  {STAGE_STATUS_LABELS[stage.status] ?? stage.status}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>Start: {formatDate(stage.startDate)}</span>
                <span>Completed: {formatDate(stage.completedDate)}</span>
              </div>
              {stage.notes && (
                <p className="mt-2 text-sm text-muted-foreground">{stage.notes}</p>
              )}
              <div className="mt-3 flex gap-2">
                {stage.status === "IN_PROGRESS" && onMarkComplete && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMarkComplete(stage.id)}
                  >
                    Mark Complete
                  </Button>
                )}
                {onGenerateInvoice && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onGenerateInvoice(stage.id, stage.company.id)}
                  >
                    Generate Invoice
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
