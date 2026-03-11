"use client";

import { useSession } from "next-auth/react";
import type { UserRole } from "@/types";

const ROLE_ORDER: Record<UserRole, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  ACCOUNTS_MANAGER: 3,
  OPERATIONS_STAFF: 2,
  VIEW_ONLY: 1,
};

function getRoleLevel(role: UserRole): number {
  return ROLE_ORDER[role] ?? 0;
}

/**
 * Returns true if userRole has the same or higher privilege than requiredRole.
 */
function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

export function useAuth() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const role = (user?.role as UserRole | undefined) ?? "VIEW_ONLY";

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    return hasMinimumRole(role, requiredRole);
  };

  const hasAnyRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.some((r) => role === r || hasMinimumRole(role, r));
  };

  return {
    user,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    hasRole,
    hasAnyRole,
  };
}
