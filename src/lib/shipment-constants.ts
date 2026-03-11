import type { ShipmentStatus, ShipmentType } from "@prisma/client";

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  ORDER_CREATED: "Order Created",
  PORT_CLEARANCE: "Port Clearance",
  CLEARED: "Cleared",
  IN_TRANSIT: "In Transit",
  AT_WAREHOUSE: "At Warehouse",
  DELIVERED: "Delivered",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export const SHIPMENT_STATUS_ORDER: ShipmentStatus[] = [
  "ORDER_CREATED",
  "PORT_CLEARANCE",
  "CLEARED",
  "IN_TRANSIT",
  "AT_WAREHOUSE",
  "DELIVERED",
  "CLOSED",
];

export const SHIPMENT_STATUS_VARIANT: Record<ShipmentStatus, "default" | "success" | "warning" | "destructive" | "outline"> = {
  ORDER_CREATED: "outline",
  PORT_CLEARANCE: "warning",
  CLEARED: "outline",
  IN_TRANSIT: "default",
  AT_WAREHOUSE: "warning",
  DELIVERED: "success",
  CLOSED: "success",
  CANCELLED: "destructive",
};

export const STAGE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  SKIPPED: "Skipped",
};

export const DEFAULT_IMPORT_STAGES = [
  { stageName: "Port Clearance", stageOrder: 0 },
  { stageName: "Transportation", stageOrder: 1 },
  { stageName: "Warehousing", stageOrder: 2 },
];

export const DEFAULT_EXPORT_STAGES = [
  { stageName: "Documentation", stageOrder: 0 },
  { stageName: "Port Clearance", stageOrder: 1 },
  { stageName: "Shipment", stageOrder: 2 },
];

export function getStatusLabel(status: ShipmentStatus): string {
  return SHIPMENT_STATUS_LABELS[status] ?? status;
}

export function getTypeLabel(type: ShipmentType): string {
  return type === "IMPORT" ? "Import" : "Export";
}
