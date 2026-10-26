"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Check, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMMON_SERVICE_DESCRIPTIONS, formatAmount } from "@/lib/invoice-constants";

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

type DropdownPosition = { left: number; width: number; top?: number; bottom?: number };

const DROPDOWN_MAX_HEIGHT = 288;

function getAmount(row: LineItemRow): number {
  return row.quantity * row.unitRate;
}

export function InvoiceLineItemsEditor({
  items,
  onChange,
  errors,
}: InvoiceLineItemsEditorProps) {
  const [suggestionOpen, setSuggestionOpen] = React.useState<number | null>(null);
  // -1 = nothing highlighted, so Enter keeps whatever the user typed.
  const [highlight, setHighlight] = React.useState(-1);
  const [position, setPosition] = React.useState<DropdownPosition | null>(null);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

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

  const openSuggestions = (index: number) => {
    const current = items[index]?.description.trim().toLowerCase();
    const matchIndex = COMMON_SERVICE_DESCRIPTIONS.findIndex((d) => d.toLowerCase() === current);
    setHighlight(matchIndex);
    setSuggestionOpen(index);
  };

  const pickSuggestion = (index: number, desc: string) => {
    updateRow(index, { description: desc });
    setSuggestionOpen(null);
  };

  // The list is rendered in a portal so the table's horizontal scroll area cannot clip it.
  // Position it under the field (or above, when there is no room) and keep it attached on scroll/resize.
  const updatePosition = React.useCallback(() => {
    if (suggestionOpen === null) return;
    const el = inputRefs.current[suggestionOpen];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < DROPDOWN_MAX_HEIGHT + 16 && rect.top > spaceBelow;
    setPosition({
      left: rect.left,
      width: Math.max(rect.width, 280),
      ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    });
  }, [suggestionOpen]);

  React.useLayoutEffect(() => {
    updatePosition();
    if (suggestionOpen === null) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [suggestionOpen, updatePosition]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (suggestionOpen !== index) return;
    const count = COMMON_SERVICE_DESCRIPTIONS.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % count);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? count - 1 : h - 1));
    } else if (e.key === "Enter") {
      // Never submit the whole form from inside the list.
      e.preventDefault();
      if (highlight >= 0) pickSuggestion(index, COMMON_SERVICE_DESCRIPTIONS[highlight]);
      else setSuggestionOpen(null);
    } else if (e.key === "Escape") {
      setSuggestionOpen(null);
    }
  };

  const totalAmount = items.reduce((sum, row) => sum + getAmount(row), 0);

  const activeDescription =
    suggestionOpen !== null ? items[suggestionOpen]?.description.trim().toLowerCase() : "";

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
              <th className="text-right p-2 w-36 font-medium">Unit Rate (AED)</th>
              <th className="text-right p-2 w-36 font-medium">Amount (AED)</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((row, index) => (
              <tr key={index} className="border-b last:border-0">
                <td className="p-2">
                  <Input
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    value={row.description}
                    onChange={(e) => updateRow(index, { description: e.target.value })}
                    onFocus={() => openSuggestions(index)}
                    onClick={() => openSuggestions(index)}
                    onBlur={() => setSuggestionOpen((cur) => (cur === index ? null : cur))}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    placeholder="Service description"
                    role="combobox"
                    aria-expanded={suggestionOpen === index}
                    aria-autocomplete="list"
                    autoComplete="off"
                    className="h-9 border-0 bg-transparent focus-visible:ring-1"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={row.quantity || ""}
                    onChange={(e) => updateRow(index, { quantity: Number(e.target.value) || 0 })}
                    className="h-9 text-right border-0 bg-transparent focus-visible:ring-1"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={row.unitRate || ""}
                    onChange={(e) => updateRow(index, { unitRate: Number(e.target.value) || 0 })}
                    className="h-9 text-right border-0 bg-transparent focus-visible:ring-1"
                  />
                </td>
                <td className="p-2 text-right tabular-nums text-muted-foreground">
                  {formatAmount(getAmount(row))}
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
          <tfoot>
            <tr className="border-t bg-muted/50 font-semibold">
              <td colSpan={3} className="p-2 text-right">
                Total
              </td>
              <td className="p-2 text-right tabular-nums">AED {formatAmount(totalAmount)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {suggestionOpen !== null &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="listbox"
            style={{
              position: "fixed",
              left: position.left,
              width: position.width,
              top: position.top,
              bottom: position.bottom,
              maxHeight: DROPDOWN_MAX_HEIGHT,
            }}
            className="z-[60] flex flex-col overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl"
          >
            <p className="border-b bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Common services
            </p>
            <ul className="overflow-y-auto py-1">
              {COMMON_SERVICE_DESCRIPTIONS.map((desc, i) => {
                const selected = desc.toLowerCase() === activeDescription;
                return (
                  <li key={desc} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      tabIndex={-1}
                      // mousedown fires before the input's blur would close the list
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pickSuggestion(suggestionOpen, desc);
                      }}
                      onMouseEnter={() => setHighlight(i)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors",
                        i === highlight ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                        selected && "font-medium"
                      )}
                    >
                      {desc}
                      {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="border-t bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
              ↑↓ to browse · Enter to select · or just type your own
            </p>
          </div>,
          document.body
        )}
    </div>
  );
}
