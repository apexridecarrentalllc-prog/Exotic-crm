"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

export interface SendInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNumber: string;
  companyName?: string;
  primaryEmail?: string | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function SendInvoiceDialog({
  open,
  onOpenChange,
  invoiceNumber,
  companyName,
  primaryEmail,
  onConfirm,
  isLoading,
}: SendInvoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send invoice</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Invoice <strong>{invoiceNumber}</strong> will be marked as Sent.
          {primaryEmail ? (
            <> A copy will be emailed to {primaryEmail}.</>
          ) : (
            <> No primary contact email found for {companyName ?? "the company"}.</>
          )}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Sending..." : "Send invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
