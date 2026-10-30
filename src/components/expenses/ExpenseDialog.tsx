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
import { EXPENSE_CATEGORIES, EXPENSE_METHODS, EXPENSE_METHOD_LABELS } from "@/lib/expense-categories";
import { ShipmentSelect } from "@/components/expenses/ShipmentSelect";

const DESCRIPTION_MAX = 500;
const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

export interface ExpenseRow {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  category: string;
  amount: number;
  currency: string;
  description: string;
  vendor: string | null;
  method: string;
  shipmentId: string | null;
  shipmentRef: string | null;
  recordedByName: string;
}

export interface ExpenseSubmit {
  expenseDate: string;
  category: string;
  amount: number;
  description: string;
  vendor?: string | null;
  method: string;
  shipmentId: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);

export function ExpenseDialog({
  open,
  onOpenChange,
  initial,
  presetShipment,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this expense instead of creating a new one. */
  initial?: ExpenseRow | null;
  /** Pre-selects a shipment when adding from a shipment page. */
  presetShipment?: { id: string; referenceNumber: string } | null;
  onSubmit: (data: ExpenseSubmit) => void;
  isLoading?: boolean;
}) {
  const isEdit = !!initial;
  const [expenseDate, setExpenseDate] = React.useState(today);
  const [category, setCategory] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [vendor, setVendor] = React.useState("");
  const [method, setMethod] = React.useState("CASH");
  const [shipmentId, setShipmentId] = React.useState("");
  const [shipmentLabel, setShipmentLabel] = React.useState("");

  // Reset the form only when the dialog opens or switches expense, not on every parent render.
  const initialRef = React.useRef(initial);
  initialRef.current = initial;
  const presetRef = React.useRef(presetShipment);
  presetRef.current = presetShipment;
  const initialKey = initial ? initial.id : "";
  React.useEffect(() => {
    if (!open) return;
    const init = initialRef.current;
    const preset = presetRef.current;
    setExpenseDate(init?.expenseDate ?? today());
    setCategory(init?.category ?? "");
    setAmount(init ? String(init.amount) : "");
    setDescription(init?.description ?? "");
    setVendor(init?.vendor ?? "");
    setMethod(init?.method ?? "CASH");
    setShipmentId(init?.shipmentId ?? preset?.id ?? "");
    setShipmentLabel(init?.shipmentRef ?? preset?.referenceNumber ?? "");
  }, [open, initialKey]);

  const numAmount = parseFloat(amount);
  const amountValid = !Number.isNaN(numAmount) && numAmount > 0;
  const canSubmit = !!category && amountValid && !!expenseDate && description.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      expenseDate,
      category,
      amount: numAmount,
      description: description.trim(),
      vendor: vendor.trim() || null,
      method,
      shipmentId: shipmentId || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit expense ${initial?.expenseNumber ?? ""}` : "Add expense"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details of this expense."
              : "Record money your business spent. It is used to calculate your profit."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expense-date">Date *</Label>
              <Input
                id="expense-date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="h-10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Amount *</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  AED
                </span>
                <Input
                  id="expense-amount"
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expense-category">Category *</Label>
              <select
                id="expense-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className={SELECT_CLASS}
              >
                <option value="">Select a category</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-method">Paid by</Label>
              <select id="expense-method" value={method} onChange={(e) => setMethod(e.target.value)} className={SELECT_CLASS}>
                {EXPENSE_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {EXPENSE_METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-vendor">Paid to (vendor / supplier)</Label>
            <Input
              id="expense-vendor"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              maxLength={200}
              placeholder="e.g. Shipping line, landlord, customs broker"
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-shipment">Shipment</Label>
            <ShipmentSelect
              id="expense-shipment"
              value={shipmentId}
              selectedLabel={shipmentLabel}
              onChange={(id, label) => {
                setShipmentId(id);
                setShipmentLabel(label);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Link the expense to a shipment to see that shipment&apos;s profit. Leave empty for general business costs such as rent or salaries.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="expense-description">Description *</Label>
              <span className="text-xs text-muted-foreground">
                {description.length}/{DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id="expense-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESCRIPTION_MAX}
              rows={3}
              required
              placeholder="What was this expense for?"
              className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>

          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Recorded in <strong>AED</strong>.
          </p>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !canSubmit}>
              {isLoading ? "Saving..." : isEdit ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
