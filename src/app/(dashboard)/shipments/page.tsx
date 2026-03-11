"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { Avatar } from "@/components/ui/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown";
import { ShipmentStatusBadge } from "@/components/shipments/ShipmentStatusBadge";
import { getTypeLabel } from "@/lib/shipment-constants";
import {
  Plus,
  Upload,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  AlertTriangle,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShipmentStatus, ShipmentType } from "@prisma/client";

type ShipmentRow = {
  id: string;
  referenceNumber: string;
  type: ShipmentType;
  status: ShipmentStatus;
  origin: string;
  destination: string;
  goodsDescription: string;
  isUrgent: boolean;
  orderDate: string;
  currency: string;
  assignedCompanies: { id: string; name: string }[];
  currentStage: { stageName: string; status: string } | null;
  totalInvoiced: number;
  totalPaid: number;
};

type ApiResponse = {
  data: ShipmentRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type StatsResponse = { active: number; importCount: number; exportCount: number; urgent: number };

async function fetchShipments(params: {
  search?: string;
  status?: string;
  type?: string;
  companyId?: string;
  isUrgent?: boolean;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}): Promise<ApiResponse> {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.status) sp.set("status", params.status);
  if (params.type) sp.set("type", params.type);
  if (params.companyId) sp.set("companyId", params.companyId);
  if (params.isUrgent !== undefined) sp.set("isUrgent", String(params.isUrgent));
  if (params.startDate) sp.set("startDate", params.startDate);
  if (params.endDate) sp.set("endDate", params.endDate);
  sp.set("page", String(params.page));
  sp.set("limit", String(params.limit));
  const res = await fetch(`/api/shipments?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch shipments");
  return res.json();
}

async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch("/api/shipments/stats");
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

async function fetchCompanies(search?: string): Promise<{ data: { id: string; name: string }[] }> {
  const sp = new URLSearchParams();
  if (search) sp.set("search", search);
  sp.set("limit", "20");
  const res = await fetch(`/api/companies?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch companies");
  return res.json();
}

function daysActive(orderDate: string): number {
  const start = new Date(orderDate).getTime();
  const now = Date.now();
  return Math.floor((now - start) / (24 * 60 * 60 * 1000));
}

export default function ShipmentsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [companyId, setCompanyId] = useState("");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: [
      "shipments",
      search,
      status,
      type,
      companyId,
      urgentOnly,
      startDate,
      endDate,
      page,
      limit,
    ],
    queryFn: () =>
      fetchShipments({
        search: search || undefined,
        status: status || undefined,
        type: type || undefined,
        companyId: companyId || undefined,
        isUrgent: urgentOnly || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ["shipments-stats"],
    queryFn: fetchStats,
  });

  const { data: companiesData } = useQuery({
    queryKey: ["companies-list"],
    queryFn: () => fetchCompanies(),
  });

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatus("");
    setType("");
    setCompanyId("");
    setUrgentOnly(false);
    setStartDate("");
    setEndDate("");
    setPage(1);
  }, []);

  const hasFilters =
    search || status || type || companyId || urgentOnly || startDate || endDate;

  const columns: DataTableColumn<ShipmentRow>[] = [
    {
      id: "reference",
      header: "Reference #",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/shipments/${row.id}`}
            className="font-semibold hover:underline"
          >
            {row.referenceNumber}
          </Link>
          {row.isUrgent && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              Urgent
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: (row) => (
        <Badge
          variant={row.type === "IMPORT" ? "default" : "success"}
          className={cn(
            row.type === "IMPORT" && "bg-blue-600 hover:bg-blue-700",
            row.type === "EXPORT" && "bg-emerald-600 hover:bg-emerald-700"
          )}
        >
          {getTypeLabel(row.type)}
        </Badge>
      ),
    },
    {
      id: "route",
      header: "Origin → Destination",
      cell: (row) => (
        <span className="flex items-center gap-1 text-sm">
          <span className="truncate max-w-[100px]">{row.origin}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate max-w-[100px]">{row.destination}</span>
        </span>
      ),
    },
    {
      id: "goods",
      header: "Goods Description",
      cell: (row) => (
        <span className="max-w-[180px] truncate block text-sm text-muted-foreground">
          {row.goodsDescription}
        </span>
      ),
    },
    {
      id: "companies",
      header: "Assigned Companies",
      cell: (row) => {
        const companies = row.assignedCompanies ?? [];
        if (companies.length === 0) return "—";
        const names = companies.map((c) => c.name).join(", ");
        return (
          <Tooltip content={names} side="top">
            <div className="flex -space-x-2">
              {companies.slice(0, 3).map((c) => (
                <Avatar
                  key={c.id}
                  name={c.name}
                  className="h-6 w-6 border-2 border-background text-xs"
                />
              ))}
              {companies.length > 3 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-xs">
                  +{companies.length - 3}
                </span>
              )}
            </div>
          </Tooltip>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <ShipmentStatusBadge status={row.status} />
      ),
    },
    {
      id: "daysActive",
      header: "Days Active",
      cell: (row) => (
        <span className="tabular-nums">{daysActive(row.orderDate)}</span>
      ),
    },
    {
      id: "outstanding",
      header: "Outstanding",
      cell: (row) => {
        const outstanding = row.totalInvoiced - row.totalPaid;
        return (
          <span
            className={cn(
              "tabular-nums font-medium",
              outstanding > 0 ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {row.currency} {outstanding.toLocaleString()}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Link href={`/shipments/${row.id}`}>
            <Button variant="ghost" size="icon-sm" aria-label="View">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/shipments/${row.id}/edit`}>
            <Button variant="ghost" size="icon-sm" aria-label="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/shipments/${row.id}?duplicate=1`}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/shipments/${row.id}`}>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Mark Urgent
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/shipments/${row.id}`}>
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipments & Orders"
        actions={
          <div className="flex gap-2">
            <Link href="/shipments/bulk-import">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import Excel
              </Button>
            </Link>
            <Link href="/shipments/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Shipment
              </Button>
            </Link>
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active Shipments</p>
          <p className="text-2xl font-semibold">{stats?.active ?? "—"}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Import Count</p>
          <p className="text-2xl font-semibold">{stats?.importCount ?? "—"}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Export Count</p>
          <p className="text-2xl font-semibold">{stats?.exportCount ?? "—"}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Urgent Shipments</p>
          <p
            className={cn(
              "text-2xl font-semibold",
              (stats?.urgent ?? 0) > 0 && "text-destructive"
            )}
          >
            {stats?.urgent ?? "—"}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
        <Input
          placeholder="Search (ref, container, AWB, goods, company)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-[220px]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm w-[140px]"
        >
          <option value="">All statuses</option>
          <option value="ORDER_CREATED">Order Created</option>
          <option value="PORT_CLEARANCE">Port Clearance</option>
          <option value="CLEARED">Cleared</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="AT_WAREHOUSE">At Warehouse</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CLOSED">Closed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm w-[110px]"
        >
          <option value="">All types</option>
          <option value="IMPORT">Import</option>
          <option value="EXPORT">Export</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={urgentOnly}
            onChange={(e) => setUrgentOnly(e.target.checked)}
            className="rounded border-input"
          />
          Urgent only
        </label>
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm w-[160px]"
        >
          <option value="">All companies</option>
          {(companiesData?.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-9 w-[130px]"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="h-9 w-[130px]"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <DataTable<ShipmentRow>
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        pagination={
          data
            ? {
                page: data.page,
                pageSize: data.limit,
                total: data.total,
                totalPages: data.totalPages,
              }
            : undefined
        }
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setLimit(size);
          setPage(1);
        }}
        getRowId={(row) => row.id}
        emptyMessage="No shipments found. Create your first shipment to get started."
        emptyAction={{ label: "Create your first shipment", onClick: () => router.push("/shipments/new") }}
      />
    </div>
  );
}
