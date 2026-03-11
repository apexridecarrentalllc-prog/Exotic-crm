"use client";

import { Badge } from "@/components/ui/Badge";
import { SHIPMENT_STATUS_LABELS, SHIPMENT_STATUS_VARIANT } from "@/lib/shipment-constants";
import type { ShipmentStatus } from "@prisma/client";
export interface ShipmentStatusBadgeProps {
  status: ShipmentStatus;
  className?: string;
  showLabel?: boolean;
}

export function ShipmentStatusBadge({
  status,
  className,
  showLabel = true,
}: ShipmentStatusBadgeProps) {
  const variant = SHIPMENT_STATUS_VARIANT[status] ?? "outline";
  const label = SHIPMENT_STATUS_LABELS[status] ?? status;
  return (
    <Badge variant={variant} className={className}>
      {showLabel ? label : status}
    </Badge>
  );
}
