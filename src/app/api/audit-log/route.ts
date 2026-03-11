import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { parseISO, isValid, endOfDay } from "date-fns";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

async function getHandler(request: NextRequest) {
  const session = await (await import("@/lib/auth")).auth();
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden", message: "Audit log is for SUPER_ADMIN only" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || undefined;
  const entityType = searchParams.get("entityType") || undefined;
  const startDateParam = searchParams.get("startDate") || undefined;
  const endDateParam = searchParams.get("endDate") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? String(DEFAULT_PAGE), 10));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)));

  const where: { userId?: string; entityType?: string; createdAt?: { gte?: Date; lte?: Date } } = {};
  if (userId) where.userId = userId;
  if (entityType) where.entityType = entityType;
  if (startDateParam || endDateParam) {
    where.createdAt = {};
    if (startDateParam) {
      const d = parseISO(startDateParam);
      if (isValid(d)) where.createdAt.gte = d;
    }
    if (endDateParam) {
      const d = endOfDay(parseISO(endDateParam));
      if (isValid(d)) where.createdAt.lte = d;
    }
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const data = items.map((log) => ({
    id: log.id,
    userId: log.userId,
    userName: log.user.name,
    userEmail: log.user.email,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    oldValues: log.oldValues,
    newValues: log.newValues,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt.toISOString(),
  }));

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export const GET = withAuth(getHandler, { roles: ["SUPER_ADMIN"] });
