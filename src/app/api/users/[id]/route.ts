import { NextRequest, NextResponse } from "next/server";
import type { UserRole as PrismaUserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth-helpers";
import { createAuditLog } from "@/lib/auth-helpers";
import { updateUserSchema } from "@/lib/validations";
import type { UserRole } from "@/types";
import type { UserListItem } from "@/types";

async function getHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json(
      { error: "Bad Request", message: "User ID is required" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        avatar: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Not Found", message: "User not found" },
        { status: 404 }
      );
    }

    const response: UserListItem & { updatedAt: Date } = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      isActive: user.isActive,
      avatar: user.avatar,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/users/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

async function patchHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json(
      { error: "Bad Request", message: "User ID is required" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad Request", message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Not Found", message: "User not found" },
        { status: 404 }
      );
    }

    const session = await (await import("@/lib/auth")).auth();
    const currentUserId = session?.user?.id;
    const currentUserRole = session?.user?.role as string | undefined;
    if (!currentUserId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    const isSelf = id === currentUserId;
    const isSuperAdmin = currentUserRole === "SUPER_ADMIN";

    if (parsed.data.role !== undefined && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden", message: "Only SUPER_ADMIN can change user role" },
        { status: 403 }
      );
    }
    if (parsed.data.role !== undefined && isSelf) {
      return NextResponse.json(
        { error: "Forbidden", message: "You cannot change your own role" },
        { status: 403 }
      );
    }
    if (parsed.data.isActive === false && isSelf) {
      return NextResponse.json(
        { error: "Forbidden", message: "You cannot deactivate your own account" },
        { status: 403 }
      );
    }

    const oldValues = {
      name: existing.name,
      role: existing.role,
      isActive: existing.isActive,
    };
    const updateData: { name?: string; role?: PrismaUserRole; isActive?: boolean } = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;
    if (isSuperAdmin && parsed.data.role !== undefined) updateData.role = parsed.data.role as PrismaUserRole;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        avatar: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createAuditLog(
      currentUserId,
      "UPDATE",
      "User",
      id,
      oldValues,
      updateData as Record<string, unknown>,
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      avatar: user.avatar,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error("PATCH /api/users/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update user" },
      { status: 500 }
    );
  }
}

async function deleteHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json(
      { error: "Bad Request", message: "User ID is required" },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Not Found", message: "User not found" },
        { status: 404 }
      );
    }

    const session = await (await import("@/lib/auth")).auth();
    const currentUserId = session?.user?.id;
    if (!currentUserId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }
    if (id === currentUserId) {
      return NextResponse.json(
        { error: "Forbidden", message: "You cannot deactivate your own account" },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog(
      currentUserId,
      "SOFT_DELETE",
      "User",
      id,
      { isActive: existing.isActive },
      { isActive: false },
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    return NextResponse.json({
      success: true,
      message: "User deactivated successfully",
      id,
    });
  } catch (error) {
    console.error("DELETE /api/users/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to deactivate user" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
export const PATCH = withAuth(patchHandler, { roles: ["SUPER_ADMIN", "ADMIN"] });
export const DELETE = withAuth(deleteHandler, { roles: ["SUPER_ADMIN", "ADMIN"] });
