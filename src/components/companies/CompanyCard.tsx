"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Building2, ChevronRight, Phone } from "lucide-react";
import { COMPANY_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface CompanyCardProps {
  id: string;
  name: string;
  type: string[];
  isActive: boolean;
  paymentTerms?: string | null;
  outstandingBalance: number;
  totalInvoiced: number;
  currency: string;
  primaryContact?: { name: string; phone?: string | null } | null;
}

function getTypeLabel(value: string): string {
  return COMPANY_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function CompanyCard({
  id,
  name,
  type,
  isActive,
  paymentTerms,
  outstandingBalance,
  totalInvoiced,
  currency,
  primaryContact,
}: CompanyCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/companies/${id}`} className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
              <h3 className="font-semibold truncate">{name}</h3>
            </div>
          </Link>
          <Badge variant={isActive ? "success" : "outline"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {type.map((t) => (
            <Badge key={t} variant="outline" className="text-xs">
              {getTypeLabel(t)}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {primaryContact && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0" />
            <span>{primaryContact.name}</span>
            {primaryContact.phone && (
              <span className="truncate">· {primaryContact.phone}</span>
            )}
          </div>
        )}
        {paymentTerms && (
          <p className="text-xs text-muted-foreground">Terms: {paymentTerms}</p>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Outstanding</span>
          <span
            className={cn(
              "font-medium",
              outstandingBalance > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {currency} {outstandingBalance.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Invoiced</span>
          <span>{currency} {totalInvoiced.toLocaleString()}</span>
        </div>
        <Link href={`/companies/${id}`}>
          <Button variant="outline" size="sm" className="w-full mt-2">
            View
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
