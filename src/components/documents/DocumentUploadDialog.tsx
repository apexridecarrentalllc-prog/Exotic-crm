"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { DOCUMENT_TYPE_LABELS } from "@/lib/document-constants";
import { Upload } from "lucide-react";

const DOC_TYPES = [
  "BILL_OF_LADING",
  "PORT_CLEARANCE",
  "CUSTOMS_DECLARATION",
  "DELIVERY_RECEIPT",
  "INVOICE_COPY",
  "TRANSPORT_DOC",
  "INSURANCE",
  "OTHER",
] as const;

export interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: string | null;
  shipmentRef?: string;
  shipments?: Array<{ id: string; referenceNumber: string }>;
  onShipmentSelect?: (id: string, ref: string) => void;
  initialType?: string;
  onUpload: (file: File, type: string, notes: string) => Promise<void>;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  shipmentId,
  shipmentRef,
  shipments = [],
  onShipmentSelect,
  initialType,
  onUpload,
}: DocumentUploadDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [type, setType] = React.useState<string>(initialType ?? DOC_TYPES[0]);
  const [notes, setNotes] = React.useState("");
  const [dragActive, setDragActive] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open && initialType) setType(initialType);
  }, [open, initialType]);

  const reset = React.useCallback(() => {
    setFile(null);
    setType(initialType ?? DOC_TYPES[0]);
    setNotes("");
  }, [initialType]);

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !shipmentId) return;
    setSubmitting(true);
    try {
      await onUpload(file, type, notes);
      handleClose(false);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!file && !!shipmentId;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        {!shipmentId ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Select a shipment to upload documents.
            </p>
            {shipments.length > 0 && onShipmentSelect && (
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                onChange={(e) => {
                  const opt = e.target.selectedOptions[0];
                  if (opt?.value) onShipmentSelect(opt.value, opt.text);
                }}
              >
                <option value="">Choose shipment...</option>
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>{s.referenceNumber}</option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {shipmentRef && (
              <p className="text-sm text-muted-foreground">
                Shipment: <span className="font-medium text-foreground">{shipmentRef}</span>
              </p>
            )}
            <div>
              <Label>Document type</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DOCUMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>File</Label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`mt-1 flex min-h-[120px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center text-sm ${
                  dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                }`}
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  className="hidden"
                  id="doc-upload-input"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <label htmlFor="doc-upload-input" className="cursor-pointer">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 font-medium">Drop file here or click to browse</p>
                  <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG (max 20MB)</p>
                </label>
                {file && (
                  <p className="mt-2 text-foreground">{file.name}</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px]"
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || submitting}>
                {submitting ? "Uploading..." : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
