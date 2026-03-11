import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/auth-helpers";
import { updateShipmentSchema } from "@/lib/validations";
import { toNum } from "@/lib/utils";

async function getHandler(
  _request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json(
      { error: "Bad Request", message: "Shipment ID is required" },
      { status: 400 }
    );
  }

  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        stages: { include: { company: true } },
        invoices: {
          include: {
            payments: { select: { id: true, amount: true, paymentDate: true } },
          },
        },
        documents: true,
        comments: { include: { user: { select: { id: true, name: true, email: true } } } },
        statusHistory: {
          include: { changedBy: { select: { id: true, name: true } } },
          orderBy: { changedAt: "desc" },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { error: "Not Found", message: "Shipment not found" },
        { status: 404 }
      );
    }

    const invoicesWithSummary = shipment.invoices.map((inv) => ({
      ...inv,
      totalAmount: toNum(inv.totalAmount),
      paidAmount: toNum(inv.paidAmount),
      balanceAmount: toNum(inv.balanceAmount),
      paymentSummary: {
        totalPaid: toNum(inv.paidAmount),
        payments: inv.payments.map((p) => ({ id: p.id, amount: toNum(p.amount), paymentDate: p.paymentDate })),
      },
    }));

    return NextResponse.json({
      ...shipment,
      invoices: invoicesWithSummary,
    });
  } catch (error) {
    console.error("GET /api/shipments/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch shipment" },
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
      { error: "Bad Request", message: "Shipment ID is required" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const parsed = updateShipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad Request", message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.shipment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Not Found", message: "Shipment not found" },
        { status: 404 }
      );
    }

    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.origin !== undefined) updateData.origin = parsed.data.origin;
    if (parsed.data.destination !== undefined) updateData.destination = parsed.data.destination;
    if (parsed.data.goodsDescription !== undefined) updateData.goodsDescription = parsed.data.goodsDescription;
    if (parsed.data.containerNumber !== undefined) updateData.containerNumber = parsed.data.containerNumber;
    if (parsed.data.awbNumber !== undefined) updateData.awbNumber = parsed.data.awbNumber;
    if (parsed.data.weight !== undefined) updateData.weight = parsed.data.weight;
    if (parsed.data.volume !== undefined) updateData.volume = parsed.data.volume;
    if (parsed.data.cargoValue !== undefined) updateData.cargoValue = parsed.data.cargoValue;
    if (parsed.data.currency !== undefined) updateData.currency = parsed.data.currency;
    if (parsed.data.isUrgent !== undefined) updateData.isUrgent = parsed.data.isUrgent;
    if (parsed.data.internalNotes !== undefined) updateData.internalNotes = parsed.data.internalNotes;
    if (parsed.data.expectedDelivery !== undefined) updateData.expectedDelivery = parsed.data.expectedDelivery;

    const shipment = await prisma.shipment.update({
      where: { id },
      data: updateData,
      include: {
        stages: { include: { company: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog(
      userId,
      "UPDATE",
      "Shipment",
      id,
      { referenceNumber: existing.referenceNumber },
      { referenceNumber: shipment.referenceNumber },
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    return NextResponse.json(shipment);
  } catch (error) {
    console.error("PATCH /api/shipments/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update shipment" },
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
      { error: "Bad Request", message: "Shipment ID is required" },
      { status: 400 }
    );
  }

  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { invoices: { take: 1 }, payments: { take: 1 } },
    });

    if (!shipment) {
      return NextResponse.json(
        { error: "Not Found", message: "Shipment not found" },
        { status: 404 }
      );
    }

    const hasInvoices = shipment.invoices.length > 0;
    const hasPayments = shipment.payments.length > 0;
    if (hasInvoices || hasPayments) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "Cannot delete shipment that has invoices or payments. Cancel invoices and remove payments first, or set status to CANCELLED.",
        },
        { status: 409 }
      );
    }

    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.shipment.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    await createAuditLog(
      userId,
      "SOFT_DELETE",
      "Shipment",
      id,
      { status: shipment.status },
      { status: "CANCELLED" },
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("DELETE /api/shipments/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to delete shipment" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
export const PATCH = withAuth(patchHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "OPERATIONS_STAFF"],
});
export const DELETE = withAuth(deleteHandler, {
  roles: ["SUPER_ADMIN"],
});
