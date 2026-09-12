"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { InvoiceLineItemsEditor, type LineItemRow } from "@/components/invoices/InvoiceLineItemsEditor";
import { InvoiceTotals } from "@/components/invoices/InvoiceTotals";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

type InvoiceDetail = {
  id: string;
  invoiceNumber: string;
  status: string;
  lineItems: { description: string; quantity: number; unitRate: number; taxRate: number }[];
};

async function fetchInvoice(id: string): Promise<InvoiceDetail> {
  const res = await fetch(`/api/invoices/${id}`);
  if (!res.ok) throw new Error("Failed to fetch invoice");
  return res.json();
}

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [lineItems, setLineItems] = React.useState<LineItemRow[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);

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
      setInitialized(true);
    }
  }, [invoice, initialized]);

  const subtotal = React.useMemo(
    () => lineItems.reduce((s, row) => s + row.quantity * row.unitRate, 0),
    [lineItems]
  );
  const totalAmount = subtotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || invoice.status !== "DRAFT") {
      toast.error("Only draft invoices can be edited.");
      return;
    }
    const validLines = lineItems.filter((r) => r.description.trim());
    if (validLines.length === 0) {
      toast.error("Add at least one line item.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency: "AED",
          taxRate: 0,
          withholdingTax: 0,
          notes: null,
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

  if (invoice.status !== "DRAFT") {
    return (
      <div className="p-6 space-y-4">
        <p className="text-destructive">Only draft invoices can be edited.</p>
        <Link href={`/invoices/${id}`}>
          <Button variant="outline">Back to invoice</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Edit ${invoice.invoiceNumber}`}
        breadcrumbs={[
          { label: "Invoices", href: "/invoices" },
          { label: invoice.invoiceNumber, href: `/invoices/${id}` },
          { label: "Edit", href: `/invoices/${id}/edit` },
        ]}
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <Card>
            <CardHeader>
              <CardTitle>Invoice details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InvoiceLineItemsEditor items={lineItems} onChange={setLineItems} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceTotals
                subtotal={subtotal}
                totalAmount={totalAmount}
              />
            </CardContent>
          </Card>
        </div>
        <div className="mt-6 flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
          <Link href={`/invoices/${id}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
