"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

const DESCRIPTION_MAX = 500;
const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

export interface AdvanceCompanyOption {
  id: string;
  name: string;
}

export interface AdvancePaymentFormValues {
  companyId: string;
  companyName?: string;
  amount: number;
  paymentDate: string;
  notes?: string | null;
}

export interface AdvancePaymentSubmit {
  companyId: string;
  amount: number;
  paymentDate: string;
  notes?: string;
}

export interface AdvancePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: AdvanceCompanyOption[];
  /** When set, the dialog edits this advance instead of creating a new one. */
  initial?: AdvancePaymentFormValues | null;
  onSubmit: (data: AdvancePaymentSubmit) => void;
  isLoading?: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

export function AdvancePaymentDialog({
  open,
  onOpenChange,
  companies,
  initial,
  onSubmit,
  isLoading,
}: AdvancePaymentDialogProps) {
  const isEdit = !!initial;
  const [companyId, setCompanyId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [paymentDate, setPaymentDate] = React.useState(today);
  const [description, setDescription] = React.useState("");

  // Reset the form only when the dialog opens or switches advance, not on every parent render.
  const initialRef = React.useRef(initial);
  initialRef.current = initial;
  const initialKey = initial ? JSON.stringify(initial) : "";
  React.useEffect(() => {
    if (!open) return;
    const init = initialRef.current;
    setCompanyId(init?.companyId ?? "");
    setAmount(init ? String(init.amount) : "");
    setPaymentDate(init?.paymentDate ?? today());
    setDescription(init?.notes ?? "");
  }, [open, initialKey]);

  // An edited advance may belong to a company missing from the list (e.g. inactive).
  const options = React.useMemo(() => {
    if (initial?.companyId && !companies.some((c) => c.id === initial.companyId)) {
      return [...companies, { id: initial.companyId, name: initial.companyName ?? "Current company" }];
    }
    return companies;
  }, [companies, initial]);

  const numAmount = parseFloat(amount);
  const amountValid = !Number.isNaN(numAmount) && numAmount > 0;
  const canSubmit = !!companyId && amountValid && !!paymentDate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      companyId,
      amount: numAmount,
      paymentDate,
      notes: description.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit advance payment" : "Record advance payment"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details of this advance payment."
              : "Record money received in advance from a company."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="advance-company">Company *</Label>
            <select
              id="advance-company"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              required
              className={SELECT_CLASS}
            >
              <option value="">Select a company</option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="advance-amount">Amount *</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  AED
                </span>
                <Input
                  id="advance-amount"
                  type="number"
                  inputMode="decimal"
                  step={0.01}
                  min={0.01}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-10 pl-12"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="advance-date">Date *</Label>
              <Input
                id="advance-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="advance-description">Description</Label>
              <span className="text-xs text-muted-foreground">
                {description.length}/{DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id="advance-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESCRIPTION_MAX}
              rows={3}
              placeholder="What is this advance for?"
              className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>

          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Recorded in <strong>AED</strong> as a <strong>cash</strong> payment.
          </p>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !canSubmit}>
              {isLoading ? "Saving..." : isEdit ? "Save changes" : "Record advance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
