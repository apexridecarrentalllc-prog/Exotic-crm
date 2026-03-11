"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown";
import { ShipmentStatusBadge } from "@/components/shipments/ShipmentStatusBadge";
import { ShipmentProgressBar } from "@/components/shipments/ShipmentProgressBar";
import { StageTimeline } from "@/components/shipments/StageTimeline";
import { DocumentChecklist } from "@/components/shipments/DocumentChecklist";
import { ShipmentComments } from "@/components/shipments/ShipmentComments";
import { StatusUpdateDialog } from "@/components/shipments/StatusUpdateDialog";
import { DuplicateShipmentDialog } from "@/components/shipments/DuplicateShipmentDialog";
import { getTypeLabel } from "@/lib/shipment-constants";
import {
  Pencil,
  MoreHorizontal,
  Copy,
  ChevronRight,
  AlertTriangle,
  Loader2,
  FileText,
  Upload,
  Inbox,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ShipmentStatus } from "@prisma/client";
import toast from "react-hot-toast";

type ShipmentDetail = {
  id: string;
  referenceNumber: string;
  type: string;
  status: ShipmentStatus;
  origin: string;
  destination: string;
  goodsDescription: string;
  containerNumber: string | null;
  awbNumber: string | null;
  weight: unknown;
  volume: unknown;
  cargoValue: unknown;
  currency: string;
  isUrgent: boolean;
  internalNotes: string | null;
  orderDate: string;
  expectedDelivery: string | null;
  actualDelivery: string | null;
  createdAt: string;
  stages: Array<{
    id: string;
    stageName: string;
    stageOrder: number;
    status: string;
    startDate: string | null;
    completedDate: string | null;
    notes: string | null;
    company: { id: string; name: string };
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    dueDate: string;
    company?: { name: string };
  }>;
  documents: Array<{
    id: string;
    fileName: string;
    type: string;
    createdAt: string;
    fileSize: number;
  }>;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    user: { id: string; name: string | null; email: string | null };
  }>;
  statusHistory: Array<{
    id: string;
    status: string;
    changedAt: string;
    notes: string | null;
    changedBy: { id: string; name: string | null } | null;
  }>;
};

async function fetchShipment(id: string): Promise<ShipmentDetail> {
  const res = await fetch(`/api/shipments/${id}`);
  if (!res.ok) throw new Error("Failed to fetch shipment");
  const data = await res.json();
  return { ...data, invoices: data.invoices ?? [] };
}

function daysActive(orderDate: string): number {
  return Math.floor(
    (Date.now() - new Date(orderDate).getTime()) / (24 * 60 * 60 * 1000)
  );
}

export default function ShipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id as string;
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("overview");

  const { data: shipment, isLoading } = useQuery({
    queryKey: ["shipment", id],
    queryFn: () => fetchShipment(id),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: ShipmentStatus; notes?: string }) => {
      const res = await fetch(`/api/shipments/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipment", id] });
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/shipments/${id}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to duplicate");
      return res.json();
    },
    onSuccess: (data: { id: string }) => {
      toast.success("Shipment duplicated");
      router.push(`/shipments/${data.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stageCompleteMutation = useMutation({
    mutationFn: async (stageId: string) => {
      const res = await fetch(`/api/shipments/${id}/stages/${stageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED", completedDate: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to complete stage");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipment", id] });
      toast.success("Stage marked complete");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/shipments/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipment", id] });
    },
  });

  if (!id) {
    return (
      <div className="p-6">
        <p className="text-destructive">Invalid shipment ID</p>
      </div>
    );
  }

  if (isLoading || !shipment) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const docChecklist = (shipment.documents ?? []).map((d) => ({
    type: d.type,
    label: d.type,
    uploaded: true,
    documentId: d.id,
  }));

  const activities = (shipment.statusHistory ?? []).map((h) => ({
    id: h.id,
    type: "status" as const,
    message: `Status changed to ${h.status}${h.notes ? `: ${h.notes}` : ""}`,
    createdAt: h.changedAt,
    user: h.changedBy ? { name: h.changedBy.name } : undefined,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={shipment.referenceNumber}
        breadcrumbs={[
          { label: "Shipments", href: "/shipments" },
          { label: shipment.referenceNumber, href: `/shipments/${id}` },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={shipment.type === "IMPORT" ? "default" : "success"}>
              {getTypeLabel(shipment.type as "IMPORT" | "EXPORT")}
            </Badge>
            <ShipmentStatusBadge status={shipment.status} />
            {shipment.isUrgent && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Urgent
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {shipment.origin}
              <ChevronRight className="inline h-4 w-4" />
              {shipment.destination}
            </span>
            <span className="text-sm text-muted-foreground">
              {daysActive(shipment.orderDate)} days active
            </span>
            <span className="text-sm text-muted-foreground">
              Created {formatDistanceToNow(new Date(shipment.createdAt), { addSuffix: true })}
            </span>
            <Link href={`/shipments/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusDialogOpen(true)}
            >
              Update status
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDuplicateDialogOpen(true)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/shipments/${id}`}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Close Shipment
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <ShipmentProgressBar
        currentStatus={shipment.status}
        onStepClick={(status) => {
          setStatusDialogOpen(false);
          statusMutation.mutate({ status });
        }}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stages">Stages & Companies</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="comments">Comments & Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Shipment details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Origin:</span> {shipment.origin}</p>
                <p><span className="text-muted-foreground">Destination:</span> {shipment.destination}</p>
                <p><span className="text-muted-foreground">Order date:</span> {new Date(shipment.orderDate).toLocaleDateString()}</p>
                {shipment.expectedDelivery && (
                  <p><span className="text-muted-foreground">Expected delivery:</span> {new Date(shipment.expectedDelivery).toLocaleDateString()}</p>
                )}
                {shipment.internalNotes && (
                  <p className="pt-2 text-muted-foreground">{shipment.internalNotes}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cargo info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Goods:</span> {shipment.goodsDescription}</p>
                {shipment.containerNumber && <p><span className="text-muted-foreground">Container:</span> {shipment.containerNumber}</p>}
                {shipment.awbNumber && <p><span className="text-muted-foreground">AWB:</span> {shipment.awbNumber}</p>}
                {shipment.cargoValue != null && <p><span className="text-muted-foreground">Value:</span> {shipment.currency} {Number(shipment.cargoValue).toLocaleString()}</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stages" className="space-y-4">
          <StageTimeline
            stages={shipment.stages.map((s) => ({
              ...s,
              company: s.company,
            }))}
            onMarkComplete={(stageId) => stageCompleteMutation.mutate(stageId)}
          />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-1" />
              Generate Invoice
            </Button>
          </div>
          {shipment.invoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Inbox className="h-10 w-10 mb-2" />
                <p>No invoices yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {shipment.invoices.map((inv) => (
                <Card key={inv.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-4">
                    <div>
                      <p className="font-medium">{inv.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {shipment.currency} {inv.totalAmount.toLocaleString()} · Due {new Date(inv.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{inv.status}</Badge>
                      <span>Paid: {shipment.currency} {inv.paidAmount.toLocaleString()}</span>
                      <span className={inv.balanceAmount > 0 ? "text-destructive font-medium" : ""}>
                        Balance: {shipment.currency} {inv.balanceAmount.toLocaleString()}
                      </span>
                      <Link href={`/invoices/${inv.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
            <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Drag & drop or browse to upload</p>
            <Button variant="outline" size="sm" className="mt-2">Upload</Button>
          </div>
          <DocumentChecklist items={docChecklist} />
          {shipment.documents.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {shipment.documents.map((d) => (
                <Card key={d.id}>
                  <CardContent className="flex items-center gap-3 pt-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{d.fileName}</p>
                      <p className="text-xs text-muted-foreground">{d.type} · {(d.fileSize / 1024).toFixed(1)} KB</p>
                    </div>
                    <Button variant="ghost" size="sm">Download</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Invoices and payments for this shipment. Total invoiced: {shipment.currency}{" "}
                {shipment.invoices.reduce((s, i) => s + i.totalAmount, 0).toLocaleString()}. Total paid:{" "}
                {shipment.currency} {shipment.invoices.reduce((s, i) => s + i.paidAmount, 0).toLocaleString()}.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <ShipmentComments
            comments={shipment.comments}
            activities={activities}
            onAddComment={(content) => commentMutation.mutate(content)}
            isLoading={commentMutation.isPending}
          />
        </TabsContent>
      </Tabs>

      <StatusUpdateDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        currentStatus={shipment.status}
        onConfirm={(status, notes) => statusMutation.mutate({ status, notes })}
        isLoading={statusMutation.isPending}
      />
      <DuplicateShipmentDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        onConfirm={() => duplicateMutation.mutate()}
        isLoading={duplicateMutation.isPending}
        referenceNumber={shipment.referenceNumber}
      />
    </div>
  );
}
