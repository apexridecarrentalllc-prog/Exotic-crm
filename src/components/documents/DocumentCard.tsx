"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown";
import { DocumentTypeIcon } from "./DocumentTypeIcon";
import { Download, Eye, Trash2, MoreVertical } from "lucide-react";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface DocumentCardProps {
  id: string;
  shipmentId: string;
  shipmentRef?: string;
  type: string;
  originalName: string;
  fileSize: number;
  createdAt: string;
  uploaderName?: string;
  onView?: () => void;
  onDelete?: () => void;
}

export function DocumentCard({
  id,
  shipmentId,
  shipmentRef,
  type,
  originalName,
  fileSize,
  createdAt,
  uploaderName,
  onView,
  onDelete,
}: DocumentCardProps) {
  const downloadUrl = `/api/shipments/${shipmentId}/documents/${id}`;
  const viewUrl = `/api/documents/${id}/view`;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <DocumentTypeIcon type={type} className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground" title={originalName}>
                {originalName}
              </p>
              {shipmentRef && (
                <p className="text-xs text-muted-foreground">Shipment: {shipmentRef}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {new Date(createdAt).toLocaleDateString()} · {formatFileSize(fileSize)}
                {uploaderName ? ` · ${uploaderName}` : ""}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={downloadUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onView ?? (() => window.open(viewUrl, "_blank"))}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
