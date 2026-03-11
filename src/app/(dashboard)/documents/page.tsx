"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { DocumentUploadDialog } from "@/components/documents/DocumentUploadDialog";
import { DocumentChecklist, type ChecklistItem } from "@/components/documents/DocumentChecklist";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { DOCUMENT_TYPE_LABELS } from "@/lib/document-constants";
import { Upload, LayoutGrid, List } from "lucide-react";
import toast from "react-hot-toast";

async function fetchDocuments(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  });
  const res = await fetch(`/api/documents?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

async function fetchChecklist(missingOnly: boolean) {
  const res = await fetch(`/api/documents/checklist?missingOnly=${missingOnly}`);
  if (!res.ok) throw new Error("Failed to fetch checklist");
  return res.json();
}

async function fetchShipments() {
  const res = await fetch("/api/shipments?limit=100");
  if (!res.ok) throw new Error("Failed to fetch shipments");
  return res.json();
}

async function fetchUsers() {
  const res = await fetch("/api/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("all");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [search, setSearch] = React.useState("");
  const [shipmentFilter, setShipmentFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [uploadedByFilter, setUploadedByFilter] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = React.useState<string | null>(null);
  const [selectedShipmentRef, setSelectedShipmentRef] = React.useState("");
  const [viewerDoc, setViewerDoc] = React.useState<{ id: string; url: string; mimeType: string; name: string } | null>(null);
  const [checklistMissingOnly, setChecklistMissingOnly] = React.useState(false);
  const [uploadInitialType, setUploadInitialType] = React.useState<string | undefined>(undefined);
  const [page, setPage] = React.useState(1);
  const limit = 20;

  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ["documents", search, shipmentFilter, typeFilter, uploadedByFilter, startDate, endDate, page, limit],
    queryFn: () =>
      fetchDocuments({
        search: search || undefined,
        shipmentId: shipmentFilter || undefined,
        type: typeFilter || undefined,
        uploadedById: uploadedByFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
      }),
    enabled: activeTab === "all",
  });

  const { data: checklistData } = useQuery({
    queryKey: ["documents-checklist", checklistMissingOnly],
    queryFn: () => fetchChecklist(checklistMissingOnly),
    enabled: activeTab === "checklist",
  });

  const { data: shipmentsData } = useQuery({
    queryKey: ["shipments-for-docs"],
    queryFn: fetchShipments,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-for-docs"],
    queryFn: fetchUsers,
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ shipmentId, docId }: { shipmentId: string; docId: string }) => {
      const res = await fetch(`/api/shipments/${shipmentId}/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message ?? "Delete failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["documents-checklist"] });
      toast.success("Document deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      shipmentId,
      file,
      type,
      notes,
    }: {
      shipmentId: string;
      file: File;
      type: string;
      notes: string;
    }) => {
      const form = new FormData();
      form.set("file", file);
      form.set("type", type);
      form.set("notes", notes);
      const res = await fetch(`/api/shipments/${shipmentId}/documents`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message ?? "Upload failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["documents-checklist"] });
      toast.success("Document uploaded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleUpload = async (file: File, type: string, notes: string) => {
    if (!selectedShipmentId) return;
    await uploadMutation.mutateAsync({ shipmentId: selectedShipmentId, file, type, notes });
  };

  const documents = docsData?.data ?? [];
  const shipments = shipmentsData?.data ?? [];
  const users = usersData?.data ?? [];
  const checklistItems = checklistData?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setUploadInitialType(undefined);
              setUploadOpen(true);
              setSelectedShipmentId(null);
              setSelectedShipmentRef("");
            }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Documents</TabsTrigger>
          <TabsTrigger value="checklist">Document Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-[180px]"
            />
            <select
              value={shipmentFilter}
              onChange={(e) => setShipmentFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm w-[200px]"
            >
              <option value="">All shipments</option>
              {shipments.map((s: { id: string; referenceNumber: string }) => (
                <option key={s.id} value={s.id}>{s.referenceNumber}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm w-[180px]"
            >
              <option value="">All types</option>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 w-[140px]" />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 w-[140px]" />
            <select
              value={uploadedByFilter}
              onChange={(e) => setUploadedByFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm w-[160px]"
            >
              <option value="">Uploaded by</option>
              {users.map((u: { id: string; name: string | null; email: string }) => (
                <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
              ))}
            </select>
            <div className="flex gap-1">
              <Button
                variant={viewMode === "grid" ? "outline" : "ghost"}
                size="icon"
                className="h-9 w-9"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "outline" : "ghost"}
                size="icon"
                className="h-9 w-9"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {docsLoading ? (
            <div className="rounded-md border p-8 text-center text-muted-foreground">Loading...</div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc: {
                id: string;
                shipmentId: string;
                shipmentRef: string;
                type: string;
                originalName: string;
                fileSize: number;
                createdAt: string;
                uploaderName: string;
                mimeType: string;
              }) => (
                <DocumentCard
                  key={doc.id}
                  id={doc.id}
                  shipmentId={doc.shipmentId}
                  shipmentRef={doc.shipmentRef}
                  type={doc.type}
                  originalName={doc.originalName}
                  fileSize={doc.fileSize}
                  createdAt={doc.createdAt}
                  uploaderName={doc.uploaderName}
                  onView={() => setViewerDoc({
                    id: doc.id,
                    url: `/api/documents/${doc.id}/view`,
                    mimeType: doc.mimeType || "application/pdf",
                    name: doc.originalName,
                  })}
                  onDelete={() => {
                    if (confirm("Delete this document?"))
                      deleteMutation.mutate({ shipmentId: doc.shipmentId, docId: doc.id });
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Shipment</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc: {
                    id: string;
                    shipmentId: string;
                    shipmentRef: string;
                    type: string;
                    originalName: string;
                    fileSize: number;
                    createdAt: string;
                    uploaderName: string;
                    mimeType: string;
                  }) => (
                    <TableRow key={doc.id}>
                      <TableCell>{DOCUMENT_TYPE_LABELS[doc.type as keyof typeof DOCUMENT_TYPE_LABELS] ?? doc.type}</TableCell>
                      <TableCell className="font-medium">{doc.originalName}</TableCell>
                      <TableCell>{doc.shipmentRef}</TableCell>
                      <TableCell>{new Date(doc.createdAt).toLocaleDateString()} · {doc.uploaderName}</TableCell>
                      <TableCell>{(doc.fileSize / 1024).toFixed(1)} KB</TableCell>
                      <TableCell>
                        <a href={`/api/shipments/${doc.shipmentId}/documents/${doc.id}`} download className="text-primary hover:underline text-sm mr-2">Download</a>
                        <button type="button" onClick={() => setViewerDoc({ id: doc.id, url: `/api/documents/${doc.id}/view`, mimeType: doc.mimeType ?? "application/pdf", name: doc.originalName })} className="text-primary hover:underline text-sm mr-2">View</button>
                        <button type="button" onClick={() => confirm("Delete?") && deleteMutation.mutate({ shipmentId: doc.shipmentId, docId: doc.id })} className="text-destructive hover:underline text-sm">Delete</button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {documents.length === 0 && !docsLoading && (
            <div className="rounded-md border p-8 text-center text-muted-foreground">No documents found.</div>
          )}

          {docsData?.total > limit && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-sm py-2">Page {page} of {Math.ceil(docsData.total / limit)}</span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(docsData.total / limit)} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="checklist" className="space-y-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Show only shipments with missing documents</label>
            <input
              type="checkbox"
              checked={checklistMissingOnly}
              onChange={(e) => setChecklistMissingOnly(e.target.checked)}
            />
          </div>
          <div className="space-y-4">
            {checklistItems.map((item: {
              shipmentId: string;
              shipmentRef: string;
              shipmentType: string;
              checklist: ChecklistItem[];
            }) => (
              <DocumentChecklist
                key={item.shipmentId}
                shipmentId={item.shipmentId}
                shipmentRef={item.shipmentRef}
                shipmentType={item.shipmentType}
                checklist={item.checklist}
                onUpload={(type) => {
                  setSelectedShipmentId(item.shipmentId);
                  setSelectedShipmentRef(item.shipmentRef);
                  setUploadInitialType(type);
                  setUploadOpen(true);
                }}
              />
            ))}
          </div>
          {checklistItems.length === 0 && (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
              {checklistMissingOnly ? "No shipments with missing documents." : "No active shipments."}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <DocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        shipmentId={selectedShipmentId}
        shipmentRef={selectedShipmentRef}
        shipments={shipments}
        initialType={uploadInitialType}
        onShipmentSelect={(id, ref) => {
          setSelectedShipmentId(id);
          setSelectedShipmentRef(ref);
        }}
        onUpload={handleUpload}
      />

      {viewerDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewerDoc(null)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-lg bg-background p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <Button variant="ghost" size="sm" onClick={() => setViewerDoc(null)}>Close</Button>
            </div>
            <DocumentViewer url={viewerDoc.url} mimeType={viewerDoc.mimeType} fileName={viewerDoc.name} onClose={() => setViewerDoc(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
