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
import { PAYMENT_METHOD_LABELS } from "@/lib/invoice-constants";
import { formatCurrency } from "@/lib/invoice-constants";

export interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingBalance: number;
  currency: string;
  onSubmit: (data: {
    amount: number;
    paymentDate: string;
    method: string;
    referenceNumber?: string;
    bankName?: string;
    notes?: string;
  }) => void;
  isLoading?: boolean;
}

export function PaymentDialog({
  open,
  onOpenChange,
  remainingBalance,
  currency,
  onSubmit,
  isLoading,
}: PaymentDialogProps) {
  const [amount, setAmount] = React.useState("");
  const [paymentDate, setPaymentDate] = React.useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [method, setMethod] = React.useState("BANK_TRANSFER");
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [bankName, setBankName] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setAmount("");
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setReferenceNumber("");
      setBankName("");
      setNotes("");
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (Number.isNaN(numAmount) || numAmount <= 0 || numAmount > remainingBalance) return;
    onSubmit({
      amount: numAmount,
      paymentDate,
      method,
      referenceNumber: referenceNumber.trim() || undefined,
      bankName: bankName.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Remaining balance: <strong>{formatCurrency(remainingBalance, currency)}</strong>
          </p>
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Amount *</Label>
            <Input
              id="payment-amount"
              type="number"
              step={0.01}
              min={0}
              max={remainingBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-date">Payment date *</Label>
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-method">Method *</Label>
            <select
              id="payment-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-ref">Reference (cheque # / bank ref)</Label>
            <Input
              id="payment-ref"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-bank">Bank name</Label>
            <Input
              id="payment-bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-notes">Notes</Label>
            <textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || remainingBalance <= 0}>
              {isLoading ? "Recording..." : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
