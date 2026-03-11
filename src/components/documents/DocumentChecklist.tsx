"use client";

import { DOCUMENT_TYPE_LABELS } from "@/lib/document-constants";
import { Check, X } from "lucide-react";

export interface ChecklistItem {
  type: string;
  required: boolean;
  uploaded: boolean;
  document: {
    id: string;
    fileName: string;
    originalName: string;
    fileSize: number;
    version: number;
    createdAt: string;
    uploaderName: string | null;
  } | null;
}

export interface DocumentChecklistProps {
  shipmentId: string;
  shipmentRef: string;
  shipmentType: string;
  checklist: ChecklistItem[];
  onUpload?: (type: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentChecklist({
  shipmentRef,
  checklist,
  onUpload,
}: DocumentChecklistProps) {
  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">
          {shipmentRef}
        </h4>
      </div>
      <ul className="space-y-2">
        {checklist.map((item) => (
          <li
            key={item.type}
            className="flex items-center justify-between gap-4 rounded-md border bg-card px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-3">
              {item.uploaded ? (
                <Check className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <X className="h-5 w-5 shrink-0 text-destructive" />
              )}
              <span className="font-medium">
                {DOCUMENT_TYPE_LABELS[item.type as keyof typeof DOCUMENT_TYPE_LABELS] ?? item.type}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {item.uploaded && item.document ? (
                <span className="text-xs text-muted-foreground">
                  {item.document.originalName} · {formatFileSize(item.document.fileSize)} ·{" "}
                  {new Date(item.document.createdAt).toLocaleDateString()}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Missing</span>
              )}
              {!item.uploaded && onUpload && (
                <button
                  type="button"
                  onClick={() => onUpload(item.type)}
                  className="text-xs text-primary hover:underline"
                >
                  Upload
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
