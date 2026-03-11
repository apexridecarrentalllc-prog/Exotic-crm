"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { InvoicePreview } from "@/components/invoices/InvoicePreview";
import { PaymentHistory } from "@/components/invoices/PaymentHistory";
import { PaymentDialog } from "@/components/invoices/PaymentDialog";
import { CreditNoteDialog } from "@/components/invoices/CreditNoteDialog";
import { SendInvoiceDialog } from "@/components/invoices/SendInvoiceDialog";
import { formatCurrency } from "@/lib/invoice-constants";
import { DownloadExportButton } from "@/components/shared/DownloadExportButton";
import {
  Pencil,
  Send,
  CreditCard,
  MoreHorizontal,
  X,
  FileText,
  ExternalLink,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

type InvoiceDetail = {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  withholdingTax: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  notes?: string | null;
  sentAt?: string | null;
  company: { id: string; name: string };
  shipment: { id: string; referenceNumber: string };
  lineItems: { description: string; quantity: number; unitRate: number; amount: number; taxRate: number }[];
  payments: { id: string; amount: number; paymentDate: string; method: string; referenceNumber?: string | null; recordedBy?: { name: string | null } | null }[];
};

async function fetchInvoice(id: string): Promise<InvoiceDetail> {
  const res = await fetch(`/api/invoices/${id}`);
  if (!res.ok) throw new Error("Failed to fetch invoice");
  return res.json();
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params?.id as string;
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [creditNoteDialogOpen, setCreditNoteDialogOpen] = React.useState(false);
  const [sendDialogOpen, setSendDialogOpen] = React.useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => fetchInvoice(id),
    enabled: !!id,
  });

  const paymentMutation = useMutation({
    mutationFn: async (body: { amount: number; paymentDate: string; method: string; referenceNumber?: string; bankName?: string; notes?: string }) => {
      const res = await fetch(`/api/invoices/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Failed to record payment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      toast.success("Payment recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const creditNoteMutation = useMutation({
    mutationFn: async (body: { amount: number; reason: string }) => {
      const res = await fetch(`/api/invoices/${id}/credit-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create credit note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      toast.success("Credit note created");
      setCreditNoteDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to send invoice");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      toast.success("Invoice sent");
      setSendDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!id) {
    return <div className="p-6"><p className="text-destructive">Invalid invoice ID</p></div>;
  }
  if (isLoading || !invoice) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const lineItemsForPreview = invoice.lineItems.map((li) => ({
    description: li.description,
    quantity: li.quantity,
    unitRate: li.unitRate,
    taxRate: li.taxRate,
  }));
  const progressPercent = invoice.totalAmount > 0 ? (invoice.paidAmount / invoice.totalAmount) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.invoiceNumber}
        className="no-print"
        breadcrumbs={[
          { label: "Invoices", href: "/invoices" },
          { label: invoice.invoiceNumber, href: `/invoices/${id}` },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} />
            {invoice.status === "DRAFT" && (
              <Link href={`/invoices/${id}/edit`}>
                <Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
              </Link>
            )}
            <DownloadExportButton
              type="pdf"
              label="Download PDF"
              downloadUrl={`/api/invoices/${id}/pdf`}
            />
            {(invoice.status === "DRAFT" || invoice.status === "SENT") && (
              <Button variant="outline" size="sm" onClick={() => setSendDialogOpen(true)}>
                <Send className="h-4 w-4 mr-1" /> Send Invoice
              </Button>
            )}
            {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && invoice.balanceAmount > 0 && (
              <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                <CreditCard className="h-4 w-4 mr-1" /> Record Payment
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCreditNoteDialogOpen(true)} disabled={invoice.balanceAmount <= 0}>
                  <FileText className="h-4 w-4 mr-2" /> Credit Note
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/invoices/${id}?cancel=1`}>
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
        <div data-print-area>
          <InvoicePreview
            invoiceNumber={invoice.invoiceNumber}
            issueDate={invoice.issueDate}
            dueDate={invoice.dueDate}
            currency={invoice.currency}
            companyName={invoice.company.name}
            shipmentReference={invoice.shipment.referenceNumber}
            lineItems={lineItemsForPreview}
            subtotal={invoice.subtotal}
            taxRate={invoice.taxRate}
            taxAmount={invoice.taxAmount}
            withholdingTax={invoice.withholdingTax}
            totalAmount={invoice.totalAmount}
            isPreview
          />
        </div>

        <div className="space-y-4 no-print">
          <Card>
            <CardHeader>
              <CardTitle>Payment status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, progressPercent)}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(invoice.paidAmount, invoice.currency)} of {formatCurrency(invoice.totalAmount, invoice.currency)} paid
              </p>
              <p className={invoice.balanceAmount > 0 ? "text-lg font-semibold text-destructive" : "text-lg font-semibold text-emerald-600"}>
                Balance: {formatCurrency(invoice.balanceAmount, invoice.currency)}
              </p>
              {invoice.balanceAmount > 0 && (
                <Button className="w-full" size="sm" onClick={() => setPaymentDialogOpen(true)}>
                  <CreditCard className="h-4 w-4 mr-1" /> Record Payment
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment history</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentHistory payments={invoice.payments} currency={invoice.currency} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Created {new Date(invoice.issueDate).toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
              {invoice.sentAt && <p>Sent {new Date(invoice.sentAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</p>}
              <p>Due {new Date(invoice.dueDate).toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Related</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/shipments/${invoice.shipment.id}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                <ExternalLink className="h-4 w-4" /> Shipment {invoice.shipment.referenceNumber}
              </Link>
              <Link href={`/companies/${invoice.company.id}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                <ExternalLink className="h-4 w-4" /> {invoice.company.name}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        remainingBalance={invoice.balanceAmount}
        currency={invoice.currency}
        onSubmit={(data) => paymentMutation.mutate(data)}
        isLoading={paymentMutation.isPending}
      />
      <CreditNoteDialog
        open={creditNoteDialogOpen}
        onOpenChange={setCreditNoteDialogOpen}
        maxAmount={invoice.balanceAmount}
        currency={invoice.currency}
        onSubmit={(data) => creditNoteMutation.mutate(data)}
        isLoading={creditNoteMutation.isPending}
      />
      <SendInvoiceDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        invoiceNumber={invoice.invoiceNumber}
        companyName={invoice.company.name}
        onConfirm={() => sendMutation.mutate()}
        isLoading={sendMutation.isPending}
      />
    </div>
  );
}
