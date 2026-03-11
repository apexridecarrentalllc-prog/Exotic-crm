"use client";

import { useCallback } from "react";
import { DownloadExportButton } from "@/components/shared/DownloadExportButton";
import toast from "react-hot-toast";

export interface ExportButtonProps {
  reportType: string;
  startDate: string;
  endDate: string;
  companyId: string;
  format?: "excel" | "pdf";
  disabled?: boolean;
  onExportStart?: () => void;
  onExportEnd?: () => void;
  onError?: (message: string) => void;
}

export function ExportButton(props: ExportButtonProps) {
  const {
    reportType,
    startDate,
    endDate,
    companyId,
    format = "excel",
    disabled,
    onExportStart,
    onExportEnd,
    onError,
  } = props;

  const onDownload = useCallback(async () => {
    onExportStart?.();
    try {
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          companyId: companyId || undefined,
          format,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message ?? "Export failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? `report-${reportType}.${format === "pdf" ? "pdf" : "xlsx"}`;
      onExportEnd?.();
      return { blob, filename };
    } catch (e) {
      onExportEnd?.();
      const message = e instanceof Error ? e.message : "Export failed";
      onError?.(message);
      toast.error(message);
      throw e;
    }
  }, [reportType, startDate, endDate, companyId, format, onExportStart, onExportEnd, onError]);

  return (
    <DownloadExportButton
      type={format === "pdf" ? "pdf" : "excel"}
      label={format === "pdf" ? "Download PDF" : "Export to Excel"}
      onDownload={onDownload}
      disabled={disabled}
    />
  );
}
