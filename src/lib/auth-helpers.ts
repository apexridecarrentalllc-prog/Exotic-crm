import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "./auth";
import { prisma } from "./prisma";
import type { UserRole } from "@/types";

export type ApiHandler = (
  request: NextRequest,
  context: { params?: Record<string, string> }
) => Promise<NextResponse> | NextResponse;

/**
 * Get the current session (for API routes and server components).
 * Use auth() from next-auth in Server Components; use this in Route Handlers when you need the session after withAuth.
 */
export async function getServerSession() {
  return auth();
}

/**
 * Get the current user id from session. Returns null if not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Create an audit log entry.
 */
export async function createAuditLog(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      oldValues: (oldValues ?? undefined) as Prisma.InputJsonValue | undefined,
      newValues: (newValues ?? undefined) as Prisma.InputJsonValue | undefined,
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    },
  });
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  ACCOUNTS_MANAGER: 3,
  OPERATIONS_STAFF: 2,
  VIEW_ONLY: 1,
};

/**
 * Check if the user's role has at least the required privilege level.
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * HOF that wraps an API route handler with auth + optional role checks.
 * Returns 401 if not authenticated, 403 if role insufficient.
 */
export function withAuth(
  handler: ApiHandler,
  options?: { roles?: UserRole[] }
) {
  return async (
    request: NextRequest,
    context: { params?: Record<string, string> }
  ): Promise<NextResponse> => {
    try {
      const session = await auth();

      if (!session?.user) {
        return NextResponse.json(
          { error: "Unauthorized", message: "Authentication required" },
          { status: 401 }
        );
      }

      const userRole = session.user.role as UserRole | undefined;
      if (!userRole) {
        return NextResponse.json(
          { error: "Forbidden", message: "User role not found" },
          { status: 403 }
        );
      }

      if (options?.roles && options.roles.length > 0) {
        const hasAccess = options.roles.some(
          (role) => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[role]
        );
        if (!hasAccess) {
          return NextResponse.json(
            { error: "Forbidden", message: "Insufficient permissions" },
            { status: 403 }
          );
        }
      }

      return handler(request, context);
    } catch (error) {
      console.error("withAuth error:", error);
      return NextResponse.json(
        { error: "Internal Server Error", message: "Authentication check failed" },
        { status: 500 }
      );
    }
  };
}
