import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { parseISO, isValid, startOfDay, endOfDay } from "date-fns";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || undefined;
    const shipmentId = searchParams.get("shipmentId") || undefined;
    const type = searchParams.get("type") || undefined;
    const uploadedById = searchParams.get("uploadedById") || undefined;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? String(DEFAULT_PAGE), 10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)));

    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (startDateParam) {
      const d = parseISO(startDateParam);
      if (isValid(d)) startDate = startOfDay(d);
    }
    if (endDateParam) {
      const d = parseISO(endDateParam);
      if (isValid(d)) endDate = endOfDay(d);
    }

    const where: Prisma.DocumentWhereInput = {};

    if (shipmentId) where.shipmentId = shipmentId;
    if (type) where.type = type as Prisma.EnumDocumentTypeFilter;
    if (uploadedById) where.uploadedById = uploadedById;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    if (search) {
      where.OR = [
        { originalName: { contains: search, mode: "insensitive" } },
        { fileName: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { shipment: { referenceNumber: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          shipment: { select: { id: true, referenceNumber: true, type: true } },
          uploadedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.document.count({ where }),
    ]);

    const data = documents.map((d) => ({
      id: d.id,
      shipmentId: d.shipmentId,
      shipmentRef: d.shipment.referenceNumber,
      shipmentType: d.shipment.type,
      type: d.type,
      fileName: d.fileName,
      originalName: d.originalName,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      filePath: d.filePath,
      version: d.version,
      isLatest: d.isLatest,
      notes: d.notes,
      createdAt: d.createdAt.toISOString(),
      uploadedById: d.uploadedById,
      uploaderName: d.uploadedBy.name ?? d.uploadedBy.email ?? "Unknown",
    }));

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/documents:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to list documents" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
