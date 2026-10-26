"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { InvoiceLineItemsEditor, type LineItemRow } from "@/components/invoices/InvoiceLineItemsEditor";
import { InvoiceTotals } from "@/components/invoices/InvoiceTotals";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { formatAmount } from "@/lib/invoice-constants";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";
import { AlertTriangle, Building2, Loader2, Lock, Package } from "lucide-react";
import toast from "react-hot-toast";

const EDITABLE_STATUSES = ["DRAFT", "SENT", "PARTIALLY_PAID", "OVERDUE"];

type InvoiceDetail = {
  id: string;
  invoiceNumber: string;
  status: string;
  dueDate: string;
  notes?: string | null;
  paidAmount: number;
  company: { id: string; name: string };
  shipment: { id: string; referenceNumber: string };
  lineItems: { description: string; quantity: number; unitRate: number; taxRate: number }[];
  payments: { id: string }[];
  creditNotes?: { id: string }[];
};

type ShipmentOption = {
  id: string;
  referenceNumber: string;
  stages?: { company: { id: string; name: string } }[];
};

async function fetchInvoice(id: string): Promise<InvoiceDetail> {
  const res = await fetch(`/api/invoices/${id}`);
  if (!res.ok) throw new Error("Failed to fetch invoice");
  return res.json();
}

async function fetchShipments(search: string): Promise<{ data: ShipmentOption[] }> {
  const sp = new URLSearchParams({ limit: "50" });
  if (search) sp.set("search", search);
  const res = await fetch(`/api/shipments?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch shipments");
  return res.json();
}

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id as string;
  const [lineItems, setLineItems] = React.useState<LineItemRow[]>([]);
  const [dueDate, setDueDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [shipmentId, setShipmentId] = React.useState("");
  const [companyId, setCompanyId] = React.useState("");
  const [shipmentSearch, setShipmentSearch] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);
  const initialSnapshot = React.useRef("");

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => fetchInvoice(id),
    enabled: !!id,
  });

  React.useEffect(() => {
    if (invoice && !initialized) {
      setLineItems(
        invoice.lineItems?.length
          ? invoice.lineItems.map((li) => ({
              description: li.description,
              quantity: li.quantity,
              unitRate: li.unitRate,
              taxRate: 0,
            }))
          : [{ description: "", quantity: 1, unitRate: 0, taxRate: 0 }]
      );
      setDueDate(invoice.dueDate.slice(0, 10));
      setNotes(invoice.notes ?? "");
      setShipmentId(invoice.shipment.id);
      setCompanyId(invoice.company.id);
      initialSnapshot.current = JSON.stringify({
        dueDate: invoice.dueDate.slice(0, 10),
        notes: invoice.notes ?? "",
        shipmentId: invoice.shipment.id,
        companyId: invoice.company.id,
        lines: invoice.lineItems.map((li) => [li.description, li.quantity, li.unitRate]),
      });
      setInitialized(true);
    }
  }, [invoice, initialized]);

  // Company and shipment can only change while nothing has been paid or credited.
  const canChangeParties =
    !!invoice && invoice.payments.length === 0 && (invoice.creditNotes?.length ?? 0) === 0;

  const { data: shipmentsData } = useQuery({
    queryKey: ["shipments-search", shipmentSearch],
    queryFn: () => fetchShipments(shipmentSearch),
    enabled: canChangeParties,
  });

  const shipmentOptions = React.useMemo(() => {
    const list = shipmentsData?.data ?? [];
    if (invoice && !list.some((s) => s.id === invoice.shipment.id)) {
      return [{ ...invoice.shipment, stages: undefined } as ShipmentOption, ...list];
    }
    return list;
  }, [shipmentsData, invoice]);

  const companyOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    if (invoice) map.set(invoice.company.id, invoice.company);
    shipmentOptions
      .find((s) => s.id === shipmentId)
      ?.stages?.forEach((st) => st.company && map.set(st.company.id, st.company));
    return Array.from(map.values());
  }, [invoice, shipmentOptions, shipmentId]);

  const subtotal = React.useMemo(
    () => lineItems.reduce((s, row) => s + row.quantity * row.unitRate, 0),
    [lineItems]
  );
  const totalAmount = subtotal;
  const paidAmount = invoice?.paidAmount ?? 0;
  const belowPaid = totalAmount < paidAmount;

  const isDirty =
    initialized &&
    JSON.stringify({
      dueDate,
      notes,
      shipmentId,
      companyId,
      lines: lineItems.map((r) => [r.description, r.quantity, r.unitRate]),
    }) !== initialSnapshot.current;
  useBeforeUnload(isDirty && !isSubmitting);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || !EDITABLE_STATUSES.includes(invoice.status)) {
      toast.error("This invoice can no longer be edited.");
      return;
    }
    const validLines = lineItems.filter((r) => r.description.trim());
    if (validLines.length === 0) {
      toast.error("Add at least one line item.");
      return;
    }
    if (belowPaid) {
      toast.error(`Total cannot be lower than the amount already paid (${formatAmount(paidAmount)}).`);
      return;
    }
    if (!companyId || !shipmentId) {
      toast.error("Select a shipment and a company.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(canChangeParties ? { shipmentId, companyId } : {}),
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          notes: notes.trim() || null,
          lineItems: validLines.map((r) => ({
            description: r.description.trim(),
            quantity: r.quantity,
            unitRate: r.unitRate,
            taxRate: 0,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update invoice");
      }
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-stats"] });
      toast.success("Invoice updated");
      router.push(`/invoices/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!id) {
    return (
      <div className="p-6">
        <p className="text-destructive">Invalid invoice ID</p>
      </div>
    );
  }

  if (isLoading || !invoice) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!EDITABLE_STATUSES.includes(invoice.status)) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-destructive">Paid or cancelled invoices cannot be edited.</p>
        <Link href={`/invoices/${id}`}>
          <Button variant="outline">Back to invoice</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${invoice.invoiceNumber}`}
        subtitle={`${invoice.company.name} · ${invoice.shipment.referenceNumber}`}
        breadcrumbs={[
          { label: "Invoices", href: "/invoices" },
          { label: invoice.invoiceNumber, href: `/invoices/${id}` },
          { label: "Edit", href: `/invoices/${id}/edit` },
        ]}
        actions={<InvoiceStatusBadge status={invoice.status} />}
      />

      {invoice.status !== "DRAFT" && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This invoice has already been sent. Your changes are saved in its revision history and the
            balance is recalculated
            {paidAmount > 0 ? `. ${formatAmount(paidAmount)} is already paid, so the total cannot go below that.` : "."}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  Shipment &amp; company
                  {!canChangeParties && <Lock className="h-4 w-4 text-muted-foreground" aria-label="Locked" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {canChangeParties ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="edit-shipment-search">Shipment</Label>
                      <Input
                        id="edit-shipment-search"
                        placeholder="Search shipments by reference..."
                        value={shipmentSearch}
                        onChange={(e) => setShipmentSearch(e.target.value)}
                        className="h-10"
                      />
                      <select
                        value={shipmentId}
                        onChange={(e) => {
                          setShipmentId(e.target.value);
                          setCompanyId("");
                        }}
                        className={SELECT_CLASS}
                        aria-label="Shipment"
                      >
                        {shipmentOptions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.referenceNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-company">Company to invoice</Label>
                      <select
                        id="edit-company"
                        value={companyId}
                        onChange={(e) => setCompanyId(e.target.value)}
                        className={SELECT_CLASS}
                        required
                      >
                        <option value="">Select company</option>
                        {companyOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {!companyId && (
                        <p className="text-xs text-muted-foreground">Pick the company for this shipment.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Company</p>
                          <p className="truncate text-sm font-medium">{invoice.company.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Shipment</p>
                          <p className="truncate text-sm font-medium">{invoice.shipment.referenceNumber}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Locked because payments or credit notes exist for this invoice.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoice details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2 sm:max-w-xs">
                  <Label htmlFor="edit-due-date">Due date</Label>
                  <Input
                    id="edit-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-10"
                    required
                  />
                </div>
                <InvoiceLineItemsEditor items={lineItems} onChange={setLineItems} />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-notes">Notes</Label>
                    <span className="text-xs text-muted-foreground">{notes.length}/2000</span>
                  </div>
                  <textarea
                    id="edit-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={2000}
                    rows={3}
                    placeholder="Optional note shown with the invoice"
                    className="flex w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit lg:sticky lg:top-0">
            <CardHeader>
              <CardTitle className="text-base">Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InvoiceTotals subtotal={subtotal} totalAmount={totalAmount} />
              {paidAmount > 0 && (
                <div className="space-y-1 border-t pt-3 text-sm">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Already paid</span>
                    <span className="tabular-nums">AED {formatAmount(paidAmount)}</span>
                  </p>
                  <p className="flex justify-between font-medium">
                    <span>New balance</span>
                    <span className="tabular-nums">AED {formatAmount(Math.max(0, totalAmount - paidAmount))}</span>
                  </p>
                  {belowPaid && (
                    <p className="text-xs text-destructive">Total is lower than the amount already paid.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Always-visible action bar so Save is reachable on long invoices */}
        <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-6 py-3 backdrop-blur">
          <p className="text-sm text-muted-foreground">
            {isDirty ? (
              <span className="font-medium text-amber-600 dark:text-amber-400">Unsaved changes</span>
            ) : (
              "No changes yet"
            )}
          </p>
          <div className="flex gap-3">
            <Link href={`/invoices/${id}`}>
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={isSubmitting || belowPaid || !isDirty}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
