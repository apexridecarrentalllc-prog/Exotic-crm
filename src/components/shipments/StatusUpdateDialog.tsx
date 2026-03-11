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
import { ShipmentStatusBadge } from "./ShipmentStatusBadge";
import { SHIPMENT_STATUS_ORDER, getStatusLabel } from "@/lib/shipment-constants";
import type { ShipmentStatus } from "@prisma/client";

export interface StatusUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: ShipmentStatus;
  onConfirm: (status: ShipmentStatus, notes?: string) => void;
  isLoading?: boolean;
}

export function StatusUpdateDialog({
  open,
  onOpenChange,
  currentStatus,
  onConfirm,
  isLoading,
}: StatusUpdateDialogProps) {
  const [notes, setNotes] = React.useState("");
  const currentIndex = SHIPMENT_STATUS_ORDER.indexOf(currentStatus);
  const nextStatus = SHIPMENT_STATUS_ORDER[currentIndex + 1];

  const handleConfirm = () => {
    if (nextStatus) {
      onConfirm(nextStatus, notes.trim() || undefined);
      setNotes("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update shipment status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Current: <ShipmentStatusBadge status={currentStatus} />
          </p>
          {nextStatus ? (
            <>
              <p className="text-sm">
                Advance to: <ShipmentStatusBadge status={nextStatus} />
              </p>
              <div className="space-y-2">
                <Label htmlFor="status-notes">Notes (optional)</Label>
                <textarea
                  id="status-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Add notes for this status change..."
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Shipment is already at the final status.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {nextStatus && (
            <Button onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? "Updating..." : `Set to ${getStatusLabel(nextStatus)}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
