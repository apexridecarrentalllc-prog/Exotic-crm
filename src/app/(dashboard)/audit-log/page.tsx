"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { useAuth } from "@/hooks/useAuth";
import { History, Loader2, AlertCircle } from "lucide-react";

type AuditEntry = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: unknown;
  newValues: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

async function fetchAuditLog(params: {
  userId?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  if (params.userId) sp.set("userId", params.userId);
  if (params.entityType) sp.set("entityType", params.entityType);
  if (params.startDate) sp.set("startDate", params.startDate);
  if (params.endDate) sp.set("endDate", params.endDate);
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  const res = await fetch(`/api/audit-log?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch audit log");
  return res.json();
}

async function fetchUsers() {
  const res = await fetch("/api/users?limit=200");
  if (!res.ok) return { data: [] };
  return res.json();
}

export default function AuditLogPage() {
  const { hasAnyRole } = useAuth();
  const [userId, setUserId] = React.useState("");
  const [entityType, setEntityType] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<AuditEntry | null>(null);
  const limit = 20;

  const canAccess = hasAnyRole(["SUPER_ADMIN"]);

  const { data: usersData } = useQuery({ queryKey: ["users-list"], queryFn: fetchUsers });
  const users = usersData?.data ?? [];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["audit-log", userId || undefined, entityType || undefined, startDate || undefined, endDate || undefined, page, limit],
    queryFn: () => fetchAuditLog({ userId: userId || undefined, entityType: entityType || undefined, startDate: startDate || undefined, endDate: endDate || undefined, page, limit }),
    enabled: canAccess,
  });

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit Log" />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-muted-foreground">You do not have permission to view the audit log.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const entries: AuditEntry[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>User</Label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">All</option>
                {users.map((u: { id: string; name: string }) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Entity type</Label>
              <Input
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                placeholder="e.g. Invoice, Shipment"
              />
            </div>
            <div className="space-y-2">
              <Label>From date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log entries</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {isError && (
            <p className="text-destructive py-4">{String(error)}</p>
          )}
          {!isLoading && !isError && (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Date / Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity type</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelected(row)}
                      >
                        <TableCell className="whitespace-nowrap">{new Date(row.createdAt).toLocaleString()}</TableCell>
                        <TableCell>{row.userName ?? row.userEmail ?? row.userId}</TableCell>
                        <TableCell>{row.action}</TableCell>
                        <TableCell>{row.entityType}</TableCell>
                        <TableCell className="font-mono text-xs">{row.entityId.slice(0, 8)}…</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{row.ipAddress ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log detail</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <p><strong>Action:</strong> {selected.action}</p>
              <p><strong>Entity:</strong> {selected.entityType} / {selected.entityId}</p>
              <p><strong>User:</strong> {selected.userName ?? selected.userEmail}</p>
              <p><strong>IP:</strong> {selected.ipAddress ?? "—"}</p>
              <p><strong>Time:</strong> {new Date(selected.createdAt).toLocaleString()}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="font-medium mb-1">Old values</p>
                  <pre className="rounded bg-muted p-3 text-xs overflow-auto max-h-48">
                    {selected.oldValues != null ? JSON.stringify(selected.oldValues, null, 2) : "—"}
                  </pre>
                </div>
                <div>
                  <p className="font-medium mb-1">New values</p>
                  <pre className="rounded bg-muted p-3 text-xs overflow-auto max-h-48">
                    {selected.newValues != null ? JSON.stringify(selected.newValues, null, 2) : "—"}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
