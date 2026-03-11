import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

async function patchHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const session = await (await import("@/lib/auth")).auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = context.params?.id;
  if (!id) {
    return NextResponse.json(
      { error: "Bad Request", message: "Notification ID required" },
      { status: 400 }
    );
  }

  try {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) {
      return NextResponse.json(
        { error: "Not Found", message: "Notification not found" },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    if (body.isRead === true) {
      await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });
    }
    const updated = await prisma.notification.findUnique({
      where: { id },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/notifications/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update notification" },
      { status: 500 }
    );
  }
}

async function deleteHandler(
  _request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const session = await (await import("@/lib/auth")).auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = context.params?.id;
  if (!id) {
    return NextResponse.json(
      { error: "Bad Request", message: "Notification ID required" },
      { status: 400 }
    );
  }

  try {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) {
      return NextResponse.json(
        { error: "Not Found", message: "Notification not found" },
        { status: 404 }
      );
    }
    await prisma.notification.delete({ where: { id } });
    return NextResponse.json({ id, deleted: true });
  } catch (error) {
    console.error("DELETE /api/notifications/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to delete notification" },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(patchHandler);
export const DELETE = withAuth(deleteHandler);
