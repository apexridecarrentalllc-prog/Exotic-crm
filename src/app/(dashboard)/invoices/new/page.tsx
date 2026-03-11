"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { InvoiceLineItemsEditor, type LineItemRow } from "@/components/invoices/InvoiceLineItemsEditor";
import { InvoiceTotals } from "@/components/invoices/InvoiceTotals";
import { InvoicePreview } from "@/components/invoices/InvoicePreview";
import { CURRENCIES } from "@/lib/constants";
import { paymentTermsToDays } from "@/lib/invoice-constants";
import { addDays } from "date-fns";
import { AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

type ShipmentOption = {
  id: string;
  referenceNumber: string;
  status: string;
  stages: { company: { id: string; name: string } }[];
};

async function fetchShipments(search?: string): Promise<{ data: ShipmentOption[] }> {
  const sp = new URLSearchParams();
  if (search) sp.set("search", search);
  sp.set("limit", "50");
  const res = await fetch(`/api/shipments?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch shipments");
  return res.json();
}

async function fetchCompany(id: string) {
  const res = await fetch(`/api/companies/${id}`);
  if (!res.ok) throw new Error("Failed to fetch company");
  return res.json();
}

async function fetchInvoicesForShipment(shipmentId: string): Promise<{ data: { companyId: string }[] }> {
  const res = await fetch(`/api/invoices?shipmentId=${shipmentId}&limit=100`);
  if (!res.ok) return { data: [] };
  return res.json();
}

const STEPS = [
  { id: 1, title: "Select Shipment & Company" },
  { id: 2, title: "Invoice Details" },
  { id: 3, title: "Review & Save" },
];

export default function NewInvoicePage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [shipmentSearch, setShipmentSearch] = React.useState("");
  const [selectedShipment, setSelectedShipment] = React.useState<ShipmentOption | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = React.useState("");
  const [issueDate, setIssueDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = React.useState("PKR");
  const [exchangeRate, setExchangeRate] = React.useState(1);
  const [taxRate, setTaxRate] = React.useState(0);
  const [withholdingTax, setWithholdingTax] = React.useState(0);
  const [lineItems, setLineItems] = React.useState<LineItemRow[]>([
    { description: "", quantity: 1, unitRate: 0, taxRate: 0 },
  ]);
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { data: shipmentsData } = useQuery({
    queryKey: ["shipments-search", shipmentSearch],
    queryFn: () => fetchShipments(shipmentSearch || undefined),
  });

  const { data: companyData } = useQuery({
    queryKey: ["company", selectedCompanyId],
    queryFn: () => fetchCompany(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const { data: existingInvoices } = useQuery({
    queryKey: ["invoices-for-shipment", selectedShipment?.id],
    queryFn: () => fetchInvoicesForShipment(selectedShipment!.id),
    enabled: !!selectedShipment?.id,
  });

  const companiesFromShipment = React.useMemo(() => {
    if (!selectedShipment) return [];
    const map = new Map<string, { id: string; name: string }>();
    selectedShipment.stages?.forEach((s) => {
      if (s.company) map.set(s.company.id, s.company);
    });
    return Array.from(map.values());
  }, [selectedShipment]);

  const companyAlreadyInvoiced = React.useMemo(() => {
    if (!selectedCompanyId || !existingInvoices?.data) return false;
    return existingInvoices.data.some((inv) => inv.companyId === selectedCompanyId);
  }, [selectedCompanyId, existingInvoices]);

  React.useEffect(() => {
    if (step === 2 && companyData?.paymentTerms) {
      const days = paymentTermsToDays(companyData.paymentTerms);
      setDueDate(addDays(new Date(), days).toISOString().slice(0, 10));
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps -- set default due date when entering step 2

  const subtotal = React.useMemo(
    () => lineItems.reduce((s, row) => s + row.quantity * row.unitRate, 0),
    [lineItems]
  );
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount - withholdingTax;

  const canProceedStep1 = selectedShipment && selectedCompanyId;
  const canProceedStep2 = lineItems.some(
    (r) => r.description.trim() && r.quantity > 0 && r.unitRate >= 0
  );

  const handleSubmit = async (andSend: boolean) => {
    if (!selectedShipment || !selectedCompanyId) return;
    if (!canProceedStep2) {
      toast.error("Add at least one line item with description, quantity and rate.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        shipmentId: selectedShipment.id,
        companyId: selectedCompanyId,
        dueDate: new Date(dueDate).toISOString(),
        currency,
        taxRate,
        withholdingTax,
        notes: notes.trim() || undefined,
        lineItems: lineItems
          .filter((r) => r.description.trim())
          .map((r) => ({
            description: r.description.trim(),
            quantity: r.quantity,
            unitRate: r.unitRate,
            taxRate: r.taxRate ?? 0,
          })),
      };
      if (payload.lineItems.length === 0) {
        toast.error("At least one line item is required.");
        setIsSubmitting(false);
        return;
      }
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create invoice");
      }
      const invoice = await res.json();
      toast.success(andSend ? "Invoice created and sent" : "Invoice created as draft");
      if (andSend) {
        const sendRes = await fetch(`/api/invoices/${invoice.id}/send`, { method: "POST" });
        if (sendRes.ok) toast.success("Invoice sent");
        else toast.error("Created but send failed");
      }
      router.push(`/invoices/${invoice.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="New Invoice"
        breadcrumbs={[
          { label: "Invoices", href: "/invoices" },
          { label: "New", href: "/invoices/new" },
        ]}
      />

      <div className="flex items-center gap-2 border-b pb-4">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <button
              type="button"
              onClick={() => step > s.id && setStep(s.id)}
              className={s.id === step ? "font-medium text-primary border-b-2 border-primary -mb-4 pb-4 px-1" : "text-muted-foreground px-1"}
            >
              Step {s.id}: {s.title}
            </button>
            {i < STEPS.length - 1 && <span className="text-muted-foreground">→</span>}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Shipment & Company</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Shipment</Label>
              <Input
                placeholder="Search by reference #, status..."
                value={shipmentSearch}
                onChange={(e) => setShipmentSearch(e.target.value)}
              />
              <div className="max-h-48 overflow-auto rounded border">
                {(shipmentsData?.data ?? []).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedShipment(s);
                      setSelectedCompanyId("");
                    }}
                    className={selectedShipment?.id === s.id ? "bg-primary/10" : "hover:bg-muted"}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px" }}
                  >
                    {s.referenceNumber} — {s.status}
                  </button>
                ))}
              </div>
            </div>
            {selectedShipment && (
              <>
                <div className="space-y-2">
                  <Label>Company to invoice</Label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="">Select company</option>
                    {companiesFromShipment.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {companyAlreadyInvoiced && (
                  <div className="flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    This company already has an invoice for this shipment.
                  </div>
                )}
              </>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next: Invoice Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Invoice Date</Label>
                  <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                {currency !== "PKR" && (
                  <div className="space-y-2">
                    <Label>Exchange Rate</Label>
                    <Input
                      type="number"
                      step={0.0001}
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(Number(e.target.value) || 1)}
                    />
                  </div>
                )}
              </div>
              <InvoiceLineItemsEditor items={lineItems} onChange={setLineItems} currency={currency} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Overall Tax Rate %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Withholding Tax</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={withholdingTax}
                    onChange={(e) => setWithholdingTax(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>Next: Review</Button>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <InvoiceTotals
                  subtotal={subtotal}
                  taxRate={taxRate}
                  taxAmount={taxAmount}
                  withholdingTax={withholdingTax}
                  totalAmount={totalAmount}
                  currency={currency}
                />
              </CardContent>
            </Card>
            <InvoicePreview
              companyName={companiesFromShipment.find((c) => c.id === selectedCompanyId)?.name}
              shipmentReference={selectedShipment?.referenceNumber}
              lineItems={lineItems}
              issueDate={issueDate}
              dueDate={dueDate}
              currency={currency}
              subtotal={subtotal}
              taxRate={taxRate}
              taxAmount={taxAmount}
              withholdingTax={withholdingTax}
              totalAmount={totalAmount}
              isPreview
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Save</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Shipment: <strong>{selectedShipment?.referenceNumber}</strong> · Company:{" "}
              <strong>{companiesFromShipment.find((c) => c.id === selectedCompanyId)?.name}</strong>
            </p>
            <InvoiceTotals
              subtotal={subtotal}
              taxRate={taxRate}
              taxAmount={taxAmount}
              withholdingTax={withholdingTax}
              totalAmount={totalAmount}
              currency={currency}
            />
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => handleSubmit(false)} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save as Draft"}
              </Button>
              <Button onClick={() => handleSubmit(true)} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save & Send"}
              </Button>
              <Link href="/invoices">
                <Button variant="ghost">Cancel</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
