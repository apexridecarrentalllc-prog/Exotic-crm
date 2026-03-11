"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

export interface DuplicateShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
  referenceNumber?: string;
}

export function DuplicateShipmentDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  referenceNumber,
}: DuplicateShipmentDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicate shipment</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Create a copy of {referenceNumber ?? "this shipment"} with the same stages and companies.
          A new reference number will be generated and all dates reset.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Duplicating..." : "Duplicate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
