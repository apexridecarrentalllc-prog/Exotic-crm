"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown";
import { COMPANY_TYPES } from "@/lib/constants";
import { Plus, MoreHorizontal, Eye, Pencil, FileText, Receipt, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";

type CompanyRow = {
  id: string;
  name: string;
  type: string[];
  isActive: boolean;
  paymentTerms: string | null;
  currency: string;
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  primaryContact: { name: string; phone?: string | null } | null;
};

type ApiResponse = {
  data: CompanyRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function getTypeLabel(value: string): string {
  return COMPANY_TYPES.find((t) => t.value === value)?.label ?? value;
}

async function fetchCompanies(params: {
  search?: string;
  type?: string;
  isActive?: boolean;
  page: number;
  limit: number;
}): Promise<ApiResponse> {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.type) sp.set("type", params.type);
  if (params.isActive !== undefined) sp.set("isActive", String(params.isActive));
  sp.set("page", String(params.page));
  sp.set("limit", String(params.limit));
  const res = await fetch(`/api/companies?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch companies");
  return res.json();
}

export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("");
  const [status, setStatus] = useState<string>("all"); // all | active | inactive
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const isActiveParam =
    status === "all" ? undefined : status === "active";

  const { data, isLoading } = useQuery({
    queryKey: ["companies", search, type, isActiveParam, page, limit],
    queryFn: () =>
      fetchCompanies({
        search: search || undefined,
        type: type || undefined,
        isActive: isActiveParam,
        page,
        limit,
      }),
  });

  const clearFilters = useCallback(() => {
    setSearch("");
    setType("");
    setStatus("all");
    setPage(1);
  }, []);

  const totalCompanies = data?.total ?? 0;
  const activeCount = data?.data ? data.data.filter((c) => c.isActive).length : 0;
  const totalOutstanding = data?.data
    ? data.data.reduce((sum, c) => sum + c.outstandingBalance, 0)
    : 0;

  const columns: DataTableColumn<CompanyRow>[] = [
    {
      id: "name",
      header: "Company Name",
      cell: (row) => (
        <Link href={`/companies/${row.id}`} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.type.map((t) => (
            <Badge key={t} variant="outline" className="text-xs">
              {getTypeLabel(t)}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "primaryContact",
      header: "Primary Contact",
      cell: (row) =>
        row.primaryContact ? (
          <div>
            <div>{row.primaryContact.name}</div>
            {row.primaryContact.phone && (
              <div className="text-xs text-muted-foreground">{row.primaryContact.phone}</div>
            )}
          </div>
        ) : (
          "—"
        ),
    },
    {
      id: "paymentTerms",
      header: "Payment Terms",
      accessorKey: "paymentTerms",
      cell: (row) => row.paymentTerms ?? "—",
    },
    {
      id: "outstandingBalance",
      header: "Outstanding Balance",
      cell: (row) => (
        <span
          className={cn(
            "font-medium tabular-nums",
            row.outstandingBalance > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {row.currency} {row.outstandingBalance.toLocaleString()}
        </span>
      ),
    },
    {
      id: "totalInvoiced",
      header: "Total Invoiced",
      cell: (row) => (
        <span className="tabular-nums">
          {row.currency} {row.totalInvoiced.toLocaleString()}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.isActive ? "success" : "outline"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Link href={`/companies/${row.id}`}>
            <Button variant="ghost" size="icon-sm" aria-label="View">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/companies/${row.id}/edit`}>
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
                <Link href={`/companies/${row.id}?tab=ledger`}>
                  <FileText className="h-4 w-4 mr-2" />
                  View Ledger
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/companies/${row.id}?tab=ledger`}>
                  <Receipt className="h-4 w-4 mr-2" />
                  Statement
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/companies/${row.id}`}>
                  <UserMinus className="h-4 w-4 mr-2" />
                  Deactivate
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
        title="Companies & Partners"
        actions={
          <Link href="/companies/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </Link>
        }
      />

      <FilterBar
        statusOptions={[
          { value: "all", label: "All" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
        statusValue={status}
        onStatusChange={setStatus}
        onClear={clearFilters}
      >
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-[200px]"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm w-[180px]"
        >
          <option value="">All types</option>
          {COMPANY_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FilterBar>

      {/* Stat summary bar */}
      <div className="flex flex-wrap gap-4 rounded-lg border bg-card p-4">
        <div>
          <span className="text-sm text-muted-foreground">Total Companies</span>
          <p className="text-xl font-semibold">{totalCompanies}</p>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Active</span>
          <p className="text-xl font-semibold">{activeCount}</p>
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Total Outstanding</span>
          <p className="text-xl font-semibold tabular-nums">
            {data?.data?.[0]?.currency ?? "PKR"} {totalOutstanding.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Table - desktop */}
      <div className="hidden md:block">
        <DataTable<CompanyRow>
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
          emptyMessage="No companies found"
        />
      </div>

      {/* Cards - mobile */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl border bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          (data?.data ?? []).map((company) => (
            <Link key={company.id} href={`/companies/${company.id}`}>
              <div className="rounded-xl border bg-card p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold">{company.name}</h3>
                  <Badge variant={company.isActive ? "success" : "outline"}>
                    {company.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {company.type.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs">
                      {getTypeLabel(t)}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  {company.primaryContact?.name ?? "—"} {company.primaryContact?.phone && `· ${company.primaryContact.phone}`}
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span>Outstanding</span>
                  <span
                    className={cn(
                      company.outstandingBalance > 0 ? "text-destructive" : "text-emerald-600"
                    )}
                  >
                    {company.currency} {company.outstandingBalance.toLocaleString()}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
