"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { RolePermissionsMatrix } from "./RolePermissionsMatrix";
import type { UserRole } from "@/types";
import type { UserListItem } from "@/types";
import toast from "react-hot-toast";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "ACCOUNTS_MANAGER", label: "Accounts Manager" },
  { value: "OPERATIONS_STAFF", label: "Operations Staff" },
  { value: "VIEW_ONLY", label: "View Only" },
];

interface EditUserDialogProps {
  user: UserListItem;
  currentUserId: string;
  currentUserRole: UserRole;
  onClose: () => void;
  onSaved: () => void;
}

export function EditUserDialog({
  user,
  currentUserId,
  currentUserRole,
  onClose,
  onSaved,
}: EditUserDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<UserRole>(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const isSelf = user.id === currentUserId;
  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";

  const updateMutation = useMutation({
    mutationFn: async () => {
      const body: { name?: string; role?: UserRole; isActive?: boolean } = {
        name,
        isActive,
      };
      if (isSuperAdmin && !isSelf) body.role = role;
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message ?? "Failed to update user");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Full Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Email</Label>
            <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
          </div>
          <div>
            <Label>Role</Label>
            {isSelf ? (
              <p className="text-sm text-muted-foreground mt-1">
                You cannot change your own role.
              </p>
            ) : isSuperAdmin ? (
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                {ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role}
              </p>
            )}
          </div>
          <div>
            <Label>Status</Label>
            {isSelf ? (
              <p className="text-sm text-muted-foreground mt-1">
                You cannot deactivate your own account.
              </p>
            ) : (
              <Select
                value={isActive ? "active" : "inactive"}
                onValueChange={(v) => setIsActive(v === "active")}
              >
                <SelectTrigger className="mt-1 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label className="mb-2 block">Role permissions</Label>
            <RolePermissionsMatrix />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
