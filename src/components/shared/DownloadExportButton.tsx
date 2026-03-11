"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export type DownloadExportButtonType = "excel" | "pdf";

export interface DownloadExportButtonProps {
  /** Excel or PDF - controls icon and default label */
  type: DownloadExportButtonType;
  /** Button label (default: "Export to Excel" or "Download PDF") */
  label?: string;
  /** Direct GET URL to download (fetched with credentials) */
  downloadUrl?: string;
  /** Or async function that returns blob + filename (e.g. from POST or custom fetch) */
  onDownload?: () => Promise<{ blob: Blob; filename: string }>;
  disabled?: boolean;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}

const defaultLabels: Record<DownloadExportButtonType, string> = {
  excel: "Export to Excel",
  pdf: "Download PDF",
};

export function DownloadExportButton({
  type,
  label,
  downloadUrl,
  onDownload,
  disabled,
  variant = "outline",
  size = "sm",
  className,
}: DownloadExportButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const Icon = type === "excel" ? FileSpreadsheet : FileText;
  const displayLabel = label ?? defaultLabels[type];

  const handleClick = async () => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      if (onDownload) {
        const { blob, filename } = await onDownload();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${filename}`);
      } else if (downloadUrl) {
        const res = await fetch(downloadUrl, { credentials: "include" });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.message ?? "Download failed");
        }
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition");
        const match = disposition?.match(/filename="?([^";]+)"?/);
        const filename = match?.[1] ?? (type === "excel" ? "export.xlsx" : "document.pdf");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${filename}`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Download failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || (!downloadUrl && !onDownload)}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Icon className="h-4 w-4 mr-2" />
      )}
      {loading ? "Generating…" : displayLabel}
    </Button>
  );
}
