"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DownloadExportButton } from "@/components/shared/DownloadExportButton";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

async function bulkImport(file: File): Promise<{ created: number; createdIds?: string[]; errors: { row: number; message: string }[] }> {
  const formData = new FormData();
  formData.set("file", file);
  const res = await fetch("/api/shipments/bulk-import", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Import failed");
  }
  return res.json();
}

export default function BulkImportShipmentsPage() {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: bulkImport,
    onSuccess: (data) => {
      if (data.errors.length > 0) {
        toast.success(`Created ${data.created}. ${data.errors.length} row(s) had errors.`);
      } else {
        toast.success(`Created ${data.created} shipment(s).`);
        router.push("/shipments");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    mutation.mutate(file);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Shipments (Excel)"
        breadcrumbs={[
          { label: "Shipments", href: "/shipments" },
          { label: "Import Excel", href: "/shipments/bulk-import" },
        ]}
      />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Excel file
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Expected columns: Type, Origin, Destination, GoodsDescription, ContainerNumber, CargoValue, OrderDate. Use IMPORT or EXPORT for Type.
          </p>
          <DownloadExportButton
            type="excel"
            label="Download template"
            downloadUrl="/api/templates/shipments"
          />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 hover:border-muted-foreground/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Upload className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {file ? file.name : "Click or drag file here"}
              </p>
              <p className="text-xs text-muted-foreground">.xlsx or .xls</p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/shipments")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!file || mutation.isPending}>
                {mutation.isPending ? "Importing..." : "Import"}
              </Button>
            </div>
          </form>
          {mutation.data?.errors && mutation.data.errors.length > 0 && (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                Row errors
              </p>
              <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                {mutation.data.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>Row {e.row}: {e.message}</li>
                ))}
                {mutation.data.errors.length > 10 && (
                  <li>... and {mutation.data.errors.length - 10} more</li>
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
