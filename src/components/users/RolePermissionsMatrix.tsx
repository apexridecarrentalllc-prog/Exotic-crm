"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Check, X } from "lucide-react";
import type { UserRole } from "@/types";
import {
  ROLES_ORDER,
  PERMISSION_AREAS,
  PERMISSION_LABELS,
  getPermissionsMatrix,
} from "@/lib/role-permissions";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  ACCOUNTS_MANAGER: "Accounts Manager",
  OPERATIONS_STAFF: "Operations Staff",
  VIEW_ONLY: "View Only",
};

export function RolePermissionsMatrix({ className }: { className?: string }) {
  const matrix = getPermissionsMatrix();

  return (
    <div className={cn("overflow-x-auto rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[200px]">Permission</TableHead>
            {ROLES_ORDER.map((role) => (
              <TableHead key={role} className="text-center min-w-[100px]">
                {ROLE_LABELS[role]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {PERMISSION_AREAS.map((area) => (
            <TableRow key={area}>
              <TableCell className="font-medium text-sm">
                {PERMISSION_LABELS[area]}
              </TableCell>
              {ROLES_ORDER.map((role) => {
                const allowed = matrix[role][area];
                return (
                  <TableCell key={role} className="text-center">
                    {allowed ? (
                      <Check className="h-4 w-4 text-green-600 inline-block" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground inline-block" />
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
