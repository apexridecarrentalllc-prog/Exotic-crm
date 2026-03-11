"use client";

import {
  FileText,
  Ship,
  FileCheck,
  ClipboardList,
  Receipt,
  Truck,
  Shield,
  File,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BILL_OF_LADING: Ship,
  PORT_CLEARANCE: FileCheck,
  CUSTOMS_DECLARATION: ClipboardList,
  DELIVERY_RECEIPT: Receipt,
  INVOICE_COPY: FileText,
  TRANSPORT_DOC: Truck,
  INSURANCE: Shield,
  OTHER: File,
};

export interface DocumentTypeIconProps {
  type: string;
  className?: string;
}

export function DocumentTypeIcon({ type, className }: DocumentTypeIconProps) {
  const Icon = ICON_MAP[type] ?? File;
  return <Icon className={className} />;
}
