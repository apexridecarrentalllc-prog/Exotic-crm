"use client";

import { Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown";
import { CompanyFinancialSummary } from "@/components/companies/CompanyFinancialSummary";
import { CompanyLedger } from "@/components/companies/CompanyLedger";
import { COMPANY_TYPES } from "@/lib/constants";
import {
  Pencil,
  MoreHorizontal,
  FileText,
  Receipt,
  UserMinus,
  Loader2,
  Phone,
  Mail,
  Building2,
  Inbox,
} from "lucide-react";
import { useCallback, useState } from "react";

type CompanyDetail = {
  id: string;
  name: string;
  type: string[];
  isActive: boolean;
  address: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  paymentTerms: string | null;
  currency: string;
  taxNumber: string | null;
  contacts: Array<{
    id: string;
    name: string;
    designation: string | null;
    phone: string | null;
    email: string | null;
    isPrimary: boolean;
  }>;
  bankAccounts: Array<{
    id: string;
    bankName: string;
    accountNumber: string;
    iban: string | null;
    branchName: string | null;
    isDefault: boolean;
  }>;
  financialSummary: { totalInvoiced: number; totalPaid: number; outstanding: number };
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
    balanceAmount: number;
    dueDate: string;
    shipment?: { id: string; referenceNumber: string; status: string };
  }>;
  recentShipments: Array<{
    id: string;
    referenceNumber: string;
    status: string;
    type: string;
    origin: string;
    destination: string;
  }>;
};

type LedgerResponse = {
  companyId: string;
  companyName: string;
  currency: string;
  entries: Array<{
    date: string;
    type: "invoice" | "payment";
    description: string;
    reference: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  closingBalance: number;
  fromDate: string | null;
  toDate: string | null;
};

function getTypeLabel(value: string): string {
  return COMPANY_TYPES.find((t) => t.value === value)?.label ?? value;
}

async function fetchCompany(id: string): Promise<CompanyDetail> {
  const res = await fetch(`/api/companies/${id}`);
  if (!res.ok) throw new Error("Failed to fetch company");
  return res.json();
}

async function fetchCompanyInvoices(id: string): Promise<{ data: Array<{ id: string; invoiceNumber: string; status: string; totalAmount: number; balanceAmount: number; dueDate: string; shipment?: { referenceNumber: string } }> }> {
  const res = await fetch(`/api/companies/${id}/invoices`);
  if (!res.ok) throw new Error("Failed to fetch invoices");
  return res.json();
}

async function fetchCompanyShipments(id: string): Promise<{ data: Array<{ id: string; referenceNumber: string; status: string; type: string; origin: string; destination: string }> }> {
  const res = await fetch(`/api/companies/${id}/shipments`);
  if (!res.ok) throw new Error("Failed to fetch shipments");
  return res.json();
}

async function fetchLedger(id: string, from?: string, to?: string): Promise<LedgerResponse> {
  const sp = new URLSearchParams();
  if (from) sp.set("from", from);
  if (to) sp.set("to", to);
  const res = await fetch(`/api/companies/${id}/ledger?${sp}`);
  if (!res.ok) throw new Error("Failed to fetch ledger");
  return res.json();
}

function CompanyDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab") ?? "overview";
  const id = params?.id as string;

  const [ledgerFrom, setLedgerFrom] = useState("");
  const [ledgerTo, setLedgerTo] = useState("");

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: () => fetchCompany(id),
    enabled: !!id,
  });

  const { data: invoicesData } = useQuery({
    queryKey: ["company-invoices", id],
    queryFn: () => fetchCompanyInvoices(id),
    enabled: !!id && (tabFromUrl === "invoices" || tabFromUrl === "overview"),
  });

  const { data: shipmentsData } = useQuery({
    queryKey: ["company-shipments", id],
    queryFn: () => fetchCompanyShipments(id),
    enabled: !!id && (tabFromUrl === "shipments" || tabFromUrl === "overview"),
  });

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ["company-ledger", id, ledgerFrom || undefined, ledgerTo || undefined],
    queryFn: () => fetchLedger(id, ledgerFrom || undefined, ledgerTo || undefined),
    enabled: !!id && tabFromUrl === "ledger",
  });

  const handleLedgerDateChange = useCallback((from: string, to: string) => {
    setLedgerFrom(from);
    setLedgerTo(to);
  }, []);

  const ledgerExportUrl = id
    ? `/api/transactions/export?companyId=${id}&startDate=${ledgerFrom}&endDate=${ledgerTo}`
    : undefined;
  const statementPdfUrl = id
    ? `/api/companies/${id}/statement/pdf${ledgerFrom || ledgerTo ? `?${new URLSearchParams({ ...(ledgerFrom && { from: ledgerFrom }), ...(ledgerTo && { to: ledgerTo }) }).toString()}` : ""}`
    : undefined;

  if (!id) {
    return (
      <div className="p-6">
        <p className="text-destructive">Invalid company ID</p>
      </div>
    );
  }

  if (companyLoading || !company) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const invoices = invoicesData?.data ?? [];
  const shipments = shipmentsData?.data ?? [];
  const ledgerEntries = ledgerData?.entries ?? [];
  const activeTab = ["overview", "financial", "shipments", "invoices", "ledger"].includes(tabFromUrl) ? tabFromUrl : "overview";

  const setTab = (value: string) => {
    router.push(`/companies/${id}?tab=${value}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={company.name}
        breadcrumbs={[
          { label: "Companies", href: "/companies" },
          { label: company.name, href: `/companies/${id}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {company.type.map((t) => (
                <Badge key={t} variant="outline">
                  {getTypeLabel(t)}
                </Badge>
              ))}
            </div>
            <Badge variant={company.isActive ? "success" : "outline"}>
              {company.isActive ? "Active" : "Inactive"}
            </Badge>
            <Link href={`/companies/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/companies/${id}?tab=ledger`}>
                    <FileText className="h-4 w-4 mr-2" />
                    View Ledger
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/companies/${id}?tab=ledger`}>
                    <Receipt className="h-4 w-4 mr-2" />
                    Statement
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/companies/${id}`}>
                    <UserMinus className="h-4 w-4 mr-2" />
                    Deactivate
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial Summary</TabsTrigger>
          <TabsTrigger value="shipments">Shipments</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(company.address || company.city || company.country) && (
                <p>
                  {[company.address, company.city, company.country].filter(Boolean).join(", ")}
                </p>
              )}
              {company.paymentTerms && <p>Payment terms: {company.paymentTerms}</p>}
              {company.taxNumber && <p>Tax: {company.taxNumber}</p>}
              {company.notes && <p className="text-muted-foreground">{company.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              {company.contacts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No contacts</p>
              ) : (
                <ul className="space-y-3">
                  {company.contacts.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      {c.isPrimary && <Badge variant="outline" className="text-xs">Primary</Badge>}
                      {c.designation && <span className="text-muted-foreground">· {c.designation}</span>}
                      {c.phone && (
                        <span className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </span>
                      )}
                      {c.email && (
                        <span className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" /> {c.email}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bank Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              {company.bankAccounts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No bank accounts</p>
              ) : (
                <ul className="space-y-2">
                  {company.bankAccounts.map((b) => (
                    <li key={b.id} className="text-sm">
                      {b.bankName} — {b.accountNumber}
                      {b.iban && ` (${b.iban})`}
                      {b.isDefault && <Badge variant="outline" className="ml-2 text-xs">Default</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <CompanyFinancialSummary
            totalInvoiced={company.financialSummary.totalInvoiced}
            totalPaid={company.financialSummary.totalPaid}
            outstanding={company.financialSummary.outstanding}
            currency={company.currency}
          />
          <Card>
            <CardHeader>
              <CardTitle>Recent transactions (last 10)</CardTitle>
              <Link href={`/companies/${id}?tab=ledger`} className="text-sm text-primary hover:underline">
                View full ledger →
              </Link>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Ref</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {company.recentInvoices?.slice(0, 10).map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>Invoice</TableCell>
                        <TableCell>{inv.invoiceNumber}</TableCell>
                        <TableCell className="text-right">{company.currency} {inv.totalAmount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">—</TableCell>
                        <TableCell className="text-right">{company.currency} {inv.balanceAmount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {(!company.recentInvoices || company.recentInvoices.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No transactions yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Reference</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Origin</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          <Link href={`/shipments/${s.id}`} className="hover:underline">
                            {s.referenceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{s.type}</TableCell>
                        <TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
                        <TableCell>{s.origin}</TableCell>
                        <TableCell>{s.destination}</TableCell>
                        <TableCell>
                          <Link href={`/shipments/${s.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                    {shipments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
                          No shipments
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">
                          <Link href={`/invoices/${inv.id}`} className="hover:underline">
                            {inv.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell><Badge variant="outline">{inv.status}</Badge></TableCell>
                        <TableCell>{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">{company.currency} {inv.totalAmount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{company.currency} {inv.balanceAmount.toLocaleString()}</TableCell>
                        <TableCell>
                          {inv.balanceAmount > 0 && (
                            <Link href={`/invoices/${inv.id}`}>
                              <Button variant="outline" size="sm">Pay now</Button>
                            </Link>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {invoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
                          No invoices
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="space-y-4">
          <CompanyLedger
            companyId={id}
            companyName={company.name}
            currency={company.currency}
            entries={ledgerEntries}
            closingBalance={ledgerData?.closingBalance ?? 0}
            fromDate={ledgerData?.fromDate ?? null}
            toDate={ledgerData?.toDate ?? null}
            loading={ledgerLoading}
            onDateRangeChange={handleLedgerDateChange}
            exportUrl={ledgerExportUrl}
            statementPdfUrl={statementPdfUrl}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CompanyDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <CompanyDetailContent />
    </Suspense>
  );
}
