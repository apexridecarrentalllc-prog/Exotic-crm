import type { UserRole } from "@/types";

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  SUPER_ADMIN: "Full system access. Can manage users, all entities, and all settings.",
  ADMIN: "Full access except user creation/deletion. Can edit users (name, status).",
  ACCOUNTS_MANAGER:
    "View all data. Create and edit invoices, record payments, view reports. Cannot delete invoices or manage users/shipments.",
  OPERATIONS_STAFF:
    "Create and manage shipments, upload documents, add comments. Cannot see financial data or create invoices.",
  VIEW_ONLY: "Read-only access to dashboard, shipments, and companies. No financial data.",
};

export type PermissionArea =
  | "users_manage"
  | "users_edit"
  | "companies"
  | "shipments"
  | "invoices"
  | "invoices_delete"
  | "payments"
  | "documents"
  | "reports"
  | "transactions"
  | "financial_data";

export const PERMISSION_LABELS: Record<PermissionArea, string> = {
  users_manage: "Create/delete users",
  users_edit: "Edit user name/status",
  companies: "Companies (full)",
  shipments: "Shipments (create/edit)",
  invoices: "Invoices (create/edit)",
  invoices_delete: "Delete invoices",
  payments: "Record payments",
  documents: "Upload documents",
  reports: "View reports",
  transactions: "View transactions",
  financial_data: "View financial data",
};

const MATRIX: Record<UserRole, Record<PermissionArea, boolean>> = {
  SUPER_ADMIN: {
    users_manage: true,
    users_edit: true,
    companies: true,
    shipments: true,
    invoices: true,
    invoices_delete: true,
    payments: true,
    documents: true,
    reports: true,
    transactions: true,
    financial_data: true,
  },
  ADMIN: {
    users_manage: false,
    users_edit: true,
    companies: true,
    shipments: true,
    invoices: true,
    invoices_delete: true,
    payments: true,
    documents: true,
    reports: true,
    transactions: true,
    financial_data: true,
  },
  ACCOUNTS_MANAGER: {
    users_manage: false,
    users_edit: false,
    companies: true,
    shipments: false,
    invoices: true,
    invoices_delete: false,
    payments: true,
    documents: true,
    reports: true,
    transactions: true,
    financial_data: true,
  },
  OPERATIONS_STAFF: {
    users_manage: false,
    users_edit: false,
    companies: true,
    shipments: true,
    invoices: false,
    invoices_delete: false,
    payments: false,
    documents: true,
    reports: false,
    transactions: false,
    financial_data: false,
  },
  VIEW_ONLY: {
    users_manage: false,
    users_edit: false,
    companies: true,
    shipments: true,
    invoices: false,
    invoices_delete: false,
    payments: false,
    documents: false,
    reports: false,
    transactions: false,
    financial_data: false,
  },
};

export function hasPermission(role: UserRole, area: PermissionArea): boolean {
  return MATRIX[role]?.[area] ?? false;
}

export const ROLES_ORDER: UserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "ACCOUNTS_MANAGER",
  "OPERATIONS_STAFF",
  "VIEW_ONLY",
];

export const PERMISSION_AREAS: PermissionArea[] = [
  "users_manage",
  "users_edit",
  "companies",
  "shipments",
  "invoices",
  "invoices_delete",
  "payments",
  "documents",
  "reports",
  "transactions",
  "financial_data",
];

export function getPermissionsMatrix(): Record<UserRole, Record<PermissionArea, boolean>> {
  return MATRIX;
}
