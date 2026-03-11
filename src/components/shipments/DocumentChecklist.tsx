"use client";

import { Check, FileQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

export type DocumentCheckItem = {
  type: string;
  label: string;
  uploaded: boolean;
  documentId?: string;
};

export interface DocumentChecklistProps {
  items: DocumentCheckItem[];
  className?: string;
}

const DEFAULT_DOC_TYPES = [
  "BILL_OF_LADING",
  "PORT_CLEARANCE",
  "CUSTOMS_DECLARATION",
  "DELIVERY_RECEIPT",
  "INVOICE_COPY",
  "TRANSPORT_DOC",
  "INSURANCE",
];

const DOC_LABELS: Record<string, string> = {
  BILL_OF_LADING: "Bill of Lading",
  PORT_CLEARANCE: "Port Clearance",
  CUSTOMS_DECLARATION: "Customs Declaration",
  DELIVERY_RECEIPT: "Delivery Receipt",
  INVOICE_COPY: "Invoice Copy",
  TRANSPORT_DOC: "Transport Document",
  INSURANCE: "Insurance",
  OTHER: "Other",
};

export function DocumentChecklist({ items, className }: DocumentChecklistProps) {
  const merged = DEFAULT_DOC_TYPES.map((type) => {
    const found = items.find((i) => i.type === type);
    return {
      type,
      label: DOC_LABELS[type] ?? type,
      uploaded: found?.uploaded ?? false,
      documentId: found?.documentId,
    };
  });

  return (
    <ul className={cn("space-y-2", className)}>
      {merged.map((item) => (
        <li
          key={item.type}
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
            item.uploaded ? "border-emerald-500/30 bg-emerald-500/5" : "border-muted bg-muted/20"
          )}
        >
          {item.uploaded ? (
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <FileQuestion className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className={item.uploaded ? "font-medium" : "text-muted-foreground"}>
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
