"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
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
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { formatAmount } from "@/lib/invoice-constants";
import { DownloadExportButton } from "@/components/shared/DownloadExportButton";
import {
  Pencil,
  Trash2,
  Send,
  CreditCard,
  MoreHorizontal,
  X,
  FileText,
  ExternalLink,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { showSendFeedback } from "@/lib/invoice-send-feedback";
import { DEFAULT_CURRENCY } from "@/lib/constants";

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
  creditNotes?: { id: string }[];
  payments: { id: string; amount: number; paymentDate: string; method: string; referenceNumber?: string | null; recordedBy?: { name: string | null } | null }[];
};

async function fetchInvoice(id: string): Promise<InvoiceDetail> {
  const res = await fetch(`/api/invoices/${id}`);
  if (!res.ok) throw new Error("Failed to fetch invoice");
  return res.json();
}

const EDITABLE_STATUSES = ["DRAFT", "SENT", "PARTIALLY_PAID", "OVERDUE"];

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Failed to delete invoice");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-stats"] });
      toast.success("Invoice deleted");
      router.push("/invoices");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Failed to send invoice");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      showSendFeedback(data?.email);
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
            {EDITABLE_STATUSES.includes(invoice.status) && hasRole("ACCOUNTS_MANAGER") && (
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
                {hasRole("ADMIN") && invoice.payments.length === 0 && (invoice.creditNotes?.length ?? 0) === 0 && (
                  <DropdownMenuItem
                    onSelect={() => setDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                )}
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
            companyName={invoice.company.name}
            shipmentReference={invoice.shipment.referenceNumber}
            lineItems={lineItemsForPreview}
            subtotal={invoice.subtotal}
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
                AED {formatAmount(invoice.paidAmount)} of AED {formatAmount(invoice.totalAmount)} paid
              </p>
              <p className={invoice.balanceAmount > 0 ? "text-lg font-semibold text-destructive" : "text-lg font-semibold text-emerald-600"}>
                Balance: AED {formatAmount(invoice.balanceAmount)}
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
              <PaymentHistory payments={invoice.payments} currency={DEFAULT_CURRENCY} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Created {new Date(invoice.issueDate).toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
              {invoice.sentAt && <p>Sent {new Date(invoice.sentAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</p>}
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
        currency={DEFAULT_CURRENCY}
        onSubmit={(data) => paymentMutation.mutate(data)}
        isLoading={paymentMutation.isPending}
      />
      <CreditNoteDialog
        open={creditNoteDialogOpen}
        onOpenChange={setCreditNoteDialogOpen}
        maxAmount={invoice.balanceAmount}
        currency={DEFAULT_CURRENCY}
        onSubmit={(data) => creditNoteMutation.mutate(data)}
        isLoading={creditNoteMutation.isPending}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete invoice?"
        description={`${invoice.invoiceNumber} for ${invoice.company.name} will be permanently deleted. Its number will not be reused. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          await deleteMutation.mutateAsync().catch(() => undefined);
        }}
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
