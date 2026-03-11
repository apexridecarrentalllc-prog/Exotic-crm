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
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { formatCurrency } from "@/lib/invoice-constants";

export interface CreditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxAmount: number;
  currency: string;
  onSubmit: (data: { amount: number; reason: string }) => void;
  isLoading?: boolean;
}

export function CreditNoteDialog({
  open,
  onOpenChange,
  maxAmount,
  currency,
  onSubmit,
  isLoading,
}: CreditNoteDialogProps) {
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setAmount("");
      setReason("");
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (Number.isNaN(numAmount) || numAmount <= 0 || numAmount > maxAmount) return;
    if (!reason.trim()) return;
    onSubmit({ amount: numAmount, reason: reason.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create credit note</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Max amount: <strong>{formatCurrency(maxAmount, currency)}</strong>
          </p>
          <div className="space-y-2">
            <Label htmlFor="cn-amount">Amount *</Label>
            <Input
              id="cn-amount"
              type="number"
              step={0.01}
              min={0}
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cn-reason">Reason *</Label>
            <textarea
              id="cn-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create credit note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
