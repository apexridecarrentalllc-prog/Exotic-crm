import { NextRequest, NextResponse } from "next/server";
import type { NotificationType } from "@prisma/client";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

async function getHandler(request: NextRequest) {
  const session = await (await import("@/lib/auth")).auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const isReadParam = searchParams.get("isRead");
    const type = searchParams.get("type") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? String(DEFAULT_PAGE), 10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)));

    const where: { userId: string; isRead?: boolean; type?: NotificationType } = { userId };
    if (isReadParam === "true") where.isRead = true;
    if (isReadParam === "false") where.isRead = false;
    if (type) where.type = type as NotificationType;

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    const data = items.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      relatedId: n.relatedId,
      relatedType: n.relatedType,
      createdAt: n.createdAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/notifications:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

async function patchHandler(request: NextRequest) {
  const session = await (await import("@/lib/auth")).auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    if (body.markAllRead === true) {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ marked: "all" });
    }
    return NextResponse.json({});
  } catch (error) {
    console.error("PATCH /api/notifications:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update notifications" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
export const PATCH = withAuth(patchHandler);
