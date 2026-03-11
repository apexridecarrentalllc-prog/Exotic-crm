"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  UserCheck,
  UserX,
  KeyRound,
  History,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import type { UserListItem } from "@/types";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { ActivityLogDialog } from "@/components/users/ActivityLogDialog";

const ROLE_VARIANTS: Record<string, "default" | "success" | "warning" | "destructive" | "outline"> = {
  SUPER_ADMIN: "destructive",
  ADMIN: "default",
  ACCOUNTS_MANAGER: "success",
  OPERATIONS_STAFF: "warning",
  VIEW_ONLY: "outline",
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  ACCOUNTS_MANAGER: "Accounts Manager",
  OPERATIONS_STAFF: "Operations Staff",
  VIEW_ONLY: "View Only",
};

type UsersResponse = { data: UserListItem[]; total: number; page: number; pageSize: number; totalPages: number; hasMore: boolean };

async function fetchUsers(page: number, pageSize: number): Promise<UsersResponse> {
  const res = await fetch(`/api/users?page=${page}&pageSize=${pageSize}`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser, hasRole } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editUser, setEditUser] = useState<UserListItem | null>(null);
  const [activityUserId, setActivityUserId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users", page, pageSize],
    queryFn: () => fetchUsers(page, pageSize),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message ?? "Failed to deactivate");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deactivated");
      setEditUser(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message ?? "Failed to activate");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User activated");
      setEditUser(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}/reset-password`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message ?? "Failed to reset password");
      }
    },
    onSuccess: () => toast.success("Password reset. User has been emailed."),
    onError: (e: Error) => toast.error(e.message),
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const isSuperAdmin = hasRole("SUPER_ADMIN");

  type UserRow = UserListItem & Record<string, unknown>;
  const columns: DataTableColumn<UserRow>[] = [
    {
      id: "user",
      header: "User",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar
            name={row.name}
            src={row.avatar ?? undefined}
            className="h-9 w-9"
          />
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-sm text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: (row) => (
        <Badge variant={ROLE_VARIANTS[row.role] ?? "outline"}>
          {ROLE_LABELS[row.role] ?? row.role}
        </Badge>
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
      id: "lastLogin",
      header: "Last Login",
      cell: (row) =>
        row.lastLogin
          ? formatDistanceToNow(new Date(row.lastLogin), { addSuffix: true })
          : "—",
    },
    {
      id: "createdAt",
      header: "Created",
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => {
        const isSelf = currentUser?.id === row.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditUser(row)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {row.isActive ? (
                !isSelf && (
                  <DropdownMenuItem
                    onClick={() => deactivateMutation.mutate(row.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                )
              ) : (
                <DropdownMenuItem onClick={() => activateMutation.mutate(row.id)}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Activate
                </DropdownMenuItem>
              )}
              {isSuperAdmin && (
                <DropdownMenuItem
                  onClick={() => resetPasswordMutation.mutate(row.id)}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Reset Password
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setActivityUserId(row.id)}>
                <History className="mr-2 h-4 w-4" />
                View Activity Log
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage system users and roles"
        actions={
          isSuperAdmin ? (
            <Link href="/users/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </Link>
          ) : undefined
        }
      />
      <DataTable<UserRow>
        columns={columns}
        data={users as UserRow[]}
        loading={isLoading}
        pagination={{
          page,
          pageSize,
          total,
          totalPages,
        }}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        emptyMessage="No users found"
        getRowId={(row) => row.id}
      />
      {editUser && (
        <EditUserDialog
          user={editUser}
          currentUserId={currentUser?.id ?? ""}
          currentUserRole={currentUser?.role ?? "VIEW_ONLY"}
          onClose={() => setEditUser(null)}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ["users"] });
            setEditUser(null);
          }}
        />
      )}
      {activityUserId && (
        <ActivityLogDialog
          userId={activityUserId}
          onClose={() => setActivityUserId(null)}
        />
      )}
    </div>
  );
}
