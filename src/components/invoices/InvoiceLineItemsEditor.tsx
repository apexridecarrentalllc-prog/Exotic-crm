"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Plus, Trash2 } from "lucide-react";
import { COMMON_SERVICE_DESCRIPTIONS, formatCurrency } from "@/lib/invoice-constants";

export interface LineItemRow {
  description: string;
  quantity: number;
  unitRate: number;
  taxRate: number;
}

export interface InvoiceLineItemsEditorProps {
  items: LineItemRow[];
  onChange: (items: LineItemRow[]) => void;
  currency?: string;
  errors?: { lineItems?: { message?: string } };
}

function getAmount(row: LineItemRow): number {
  return row.quantity * row.unitRate;
}

export function InvoiceLineItemsEditor({
  items,
  onChange,
  currency = "PKR",
  errors,
}: InvoiceLineItemsEditorProps) {
  const [suggestionOpen, setSuggestionOpen] = React.useState<number | null>(null);

  const updateRow = (index: number, updates: Partial<LineItemRow>) => {
    const next = items.map((row, i) => (i === index ? { ...row, ...updates } : row));
    onChange(next);
  };

  const addRow = () => {
    onChange([...items, { description: "", quantity: 1, unitRate: 0, taxRate: 0 }]);
  };

  const removeRow = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Line Items</h4>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-1" />
          Add row
        </Button>
      </div>
      {errors?.lineItems?.message && (
        <p className="text-sm text-destructive">{errors.lineItems.message}</p>
      )}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2 font-medium">Description</th>
              <th className="text-right p-2 w-20 font-medium">Qty</th>
              <th className="text-right p-2 w-28 font-medium">Unit Rate</th>
              <th className="text-right p-2 w-16 font-medium">Tax %</th>
              <th className="text-right p-2 w-28 font-medium">Amount</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((row, index) => (
              <tr key={index} className="border-b last:border-0">
                <td className="p-2 relative">
                  <Input
                    value={row.description}
                    onChange={(e) => updateRow(index, { description: e.target.value })}
                    onFocus={() => setSuggestionOpen(index)}
                    onBlur={() => setTimeout(() => setSuggestionOpen(null), 150)}
                    placeholder="Service description"
                    className="h-9 border-0 bg-transparent focus-visible:ring-1"
                  />
                  {suggestionOpen === index && (
                    <ul className="absolute left-0 top-full z-10 mt-0.5 w-64 max-h-48 overflow-auto rounded-md border bg-popover py-1 shadow-md">
                      {COMMON_SERVICE_DESCRIPTIONS.map((desc) => (
                        <li key={desc}>
                          <button
                            type="button"
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                            onMouseDown={() => {
                              updateRow(index, { description: desc });
                              setSuggestionOpen(null);
                            }}
                          >
                            {desc}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={row.quantity || ""}
                    onChange={(e) => updateRow(index, { quantity: Number(e.target.value) || 0 })}
                    className="h-9 text-right border-0 bg-transparent focus-visible:ring-1"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={row.unitRate || ""}
                    onChange={(e) => updateRow(index, { unitRate: Number(e.target.value) || 0 })}
                    className="h-9 text-right border-0 bg-transparent focus-visible:ring-1"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={row.taxRate ?? ""}
                    onChange={(e) => updateRow(index, { taxRate: Number(e.target.value) || 0 })}
                    className="h-9 text-right border-0 bg-transparent focus-visible:ring-1 w-14"
                  />
                </td>
                <td className="p-2 text-right tabular-nums text-muted-foreground">
                  {formatCurrency(getAmount(row), currency)}
                </td>
                <td className="p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeRow(index)}
                    disabled={items.length <= 1}
                    aria-label="Remove row"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
