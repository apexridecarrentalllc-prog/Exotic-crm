import { NextRequest, NextResponse } from "next/server";
import type { Prisma, ShipmentStatus, ShipmentType } from "@prisma/client";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/auth-helpers";
import { createShipmentSchema } from "@/lib/validations";
import { toNum } from "@/lib/utils";
import { generateShipmentRef } from "@/lib/shipment-ref";
import { parseISO, isValid } from "date-fns";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const SORT_FIELDS = ["orderDate", "createdAt", "referenceNumber", "status"] as const;
const SORT_ORDERS = ["asc", "desc"] as const;
const SHIPMENT_STATUSES: ShipmentStatus[] = [
  "ORDER_CREATED",
  "PORT_CLEARANCE",
  "CLEARED",
  "IN_TRANSIT",
  "AT_WAREHOUSE",
  "DELIVERED",
  "CLOSED",
  "CANCELLED",
];
const SHIPMENT_TYPES: ShipmentType[] = ["IMPORT", "EXPORT"];

async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || undefined;
    const status = searchParams.get("status") as ShipmentStatus | undefined;
    const type = searchParams.get("type") as ShipmentType | undefined;
    const companyId = searchParams.get("companyId") || undefined;
    const isUrgentParam = searchParams.get("isUrgent");
    const isUrgent =
      isUrgentParam === null || isUrgentParam === ""
        ? undefined
        : isUrgentParam === "true";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? String(DEFAULT_PAGE), 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)));
    const sortBy = SORT_FIELDS.includes(searchParams.get("sortBy") as (typeof SORT_FIELDS)[number])
      ? (searchParams.get("sortBy") as (typeof SORT_FIELDS)[number])
      : "createdAt";
    const sortOrder = SORT_ORDERS.includes(searchParams.get("sortOrder") as (typeof SORT_ORDERS)[number])
      ? (searchParams.get("sortOrder") as (typeof SORT_ORDERS)[number])
      : "desc";

    const where: Prisma.ShipmentWhereInput = {};
    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: "insensitive" } },
        { containerNumber: { contains: search, mode: "insensitive" } },
        { awbNumber: { contains: search, mode: "insensitive" } },
        { goodsDescription: { contains: search, mode: "insensitive" } },
        { stages: { some: { company: { name: { contains: search, mode: "insensitive" } } } } },
      ];
    }
    if (status && SHIPMENT_STATUSES.includes(status)) where.status = status;
    if (type && SHIPMENT_TYPES.includes(type)) where.type = type;
    if (companyId) {
      where.stages = { some: { companyId } };
    }
    if (typeof isUrgent === "boolean") where.isUrgent = isUrgent;
    const orderDateFilter: { gte?: Date; lte?: Date } = {};
    if (startDateParam) {
      const d = parseISO(startDateParam);
      if (isValid(d)) orderDateFilter.gte = d;
    }
    if (endDateParam) {
      const d = parseISO(endDateParam);
      if (isValid(d)) orderDateFilter.lte = d;
    }
    if (Object.keys(orderDateFilter).length > 0) where.orderDate = orderDateFilter;

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          stages: { include: { company: { select: { id: true, name: true } } } },
          _count: { select: { invoices: true } },
        },
      }),
      prisma.shipment.count({ where }),
    ]);

    const shipmentIds = shipments.map((s) => s.id);
    const [invoiceSums, paymentSums] = await Promise.all([
      prisma.invoice.groupBy({
        by: ["shipmentId"],
        where: { shipmentId: { in: shipmentIds }, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),
      prisma.payment.groupBy({
        by: ["shipmentId"],
        where: { shipmentId: { in: shipmentIds } },
        _sum: { amount: true },
      }),
    ]);
    const invoiceMap = new Map(invoiceSums.map((i) => [i.shipmentId, toNum(i._sum.totalAmount)]));
    const paymentMap = new Map(paymentSums.map((p) => [p.shipmentId, toNum(p._sum.amount)]));

    const data = shipments.map((s) => {
      const assignedCompanies = Array.from(
        new Map(s.stages.map((st) => [st.company.id, st.company])).values()
      );
      const inProgressStage = s.stages
        .filter((st) => st.status === "IN_PROGRESS")
        .sort((a, b) => b.stageOrder - a.stageOrder)[0];
      const currentStage = inProgressStage
        ? {
            id: inProgressStage.id,
            stageName: inProgressStage.stageName,
            stageOrder: inProgressStage.stageOrder,
            status: inProgressStage.status,
            company: inProgressStage.company,
          }
        : null;
      return {
        ...s,
        assignedCompanies,
        currentStage,
        invoiceCount: s._count.invoices,
        totalInvoiced: invoiceMap.get(s.id) ?? 0,
        totalPaid: paymentMap.get(s.id) ?? 0,
        _count: undefined,
      };
    });

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/shipments:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to list shipments" },
      { status: 500 }
    );
  }
}

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createShipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad Request", message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ref = await generateShipmentRef(parsed.data.type);
    const orderDate = parsed.data.orderDate ?? new Date();

    const shipment = await prisma.shipment.create({
      data: {
        referenceNumber: ref,
        type: parsed.data.type,
        status: "ORDER_CREATED",
        origin: parsed.data.origin,
        destination: parsed.data.destination,
        goodsDescription: parsed.data.goodsDescription,
        containerNumber: parsed.data.containerNumber ?? undefined,
        awbNumber: parsed.data.awbNumber ?? undefined,
        weight: parsed.data.weight != null ? parsed.data.weight : undefined,
        volume: parsed.data.volume != null ? parsed.data.volume : undefined,
        cargoValue: parsed.data.cargoValue != null ? parsed.data.cargoValue : undefined,
        currency: parsed.data.currency ?? "PKR",
        isUrgent: parsed.data.isUrgent ?? false,
        internalNotes: parsed.data.internalNotes ?? undefined,
        orderDate,
        expectedDelivery: parsed.data.expectedDelivery ?? undefined,
        createdById: userId,
        stages:
          parsed.data.stages && parsed.data.stages.length > 0
            ? {
                create: parsed.data.stages.map((st) => ({
                  companyId: st.companyId,
                  stageName: st.stageName,
                  stageOrder: st.stageOrder,
                  status: "PENDING" as const,
                  notes: st.notes ?? undefined,
                })),
              }
            : undefined,
      },
      include: {
        stages: { include: { company: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.shipmentStatusHistory.create({
      data: {
        shipmentId: shipment.id,
        status: "ORDER_CREATED",
        changedById: userId,
        notes: "Initial status",
      },
    });

    await createAuditLog(
      userId,
      "CREATE",
      "Shipment",
      shipment.id,
      undefined,
      { referenceNumber: shipment.referenceNumber, type: shipment.type },
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    return NextResponse.json(shipment, { status: 201 });
  } catch (error) {
    console.error("POST /api/shipments:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to create shipment" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "OPERATIONS_STAFF"],
});
