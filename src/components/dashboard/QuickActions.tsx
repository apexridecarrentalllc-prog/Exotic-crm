"use client";

import Link from "next/link";
import { Package, FileText, Banknote, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const actions = [
  { href: "/shipments/new", label: "New Shipment", icon: Package },
  { href: "/invoices/new", label: "New Invoice", icon: FileText },
  { href: "/transactions", label: "Record Payment", icon: Banknote },
  { href: "/companies/new", label: "Add Company", icon: Building2 },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 hover:border-primary/30"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span className="font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
