import { NextRequest, NextResponse } from "next/server";
import type { ShipmentStatus } from "@prisma/client";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/auth-helpers";
import { createNotificationForRoles } from "@/lib/notifications";
import { shipmentStatusUpdateSchema } from "@/lib/validations";

const VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  ORDER_CREATED: ["PORT_CLEARANCE", "CANCELLED"],
  PORT_CLEARANCE: ["CLEARED", "CANCELLED"],
  CLEARED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["AT_WAREHOUSE", "DELIVERED", "CANCELLED"],
  AT_WAREHOUSE: ["IN_TRANSIT", "DELIVERED", "CANCELLED"],
  DELIVERED: ["CLOSED", "CANCELLED"],
  CLOSED: [],
  CANCELLED: [],
};

async function postHandler(
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
    const parsed = shipmentStatusUpdateSchema.safeParse(body);
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

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { invoices: { select: { id: true, status: true, balanceAmount: true } } },
    });

    if (!shipment) {
      return NextResponse.json(
        { error: "Not Found", message: "Shipment not found" },
        { status: 404 }
      );
    }

    const allowed = VALID_TRANSITIONS[shipment.status] ?? [];
    if (!allowed.includes(parsed.data.status)) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: `Invalid status transition from ${shipment.status} to ${parsed.data.status}. Allowed: ${allowed.join(", ") || "none"}.`,
        },
        { status: 400 }
      );
    }

    if (parsed.data.status === "CLOSED") {
      const unpaid = shipment.invoices.filter(
        (inv) => inv.status !== "PAID" && inv.status !== "CANCELLED"
      );
      if (unpaid.length > 0 && !parsed.data.notes) {
        return NextResponse.json(
          {
            error: "Bad Request",
            message: "Cannot close shipment with unpaid invoices. Add notes to override.",
          },
          { status: 400 }
        );
      }
    }

    const updateData: { status: ShipmentStatus; actualDelivery?: Date } = {
      status: parsed.data.status,
    };
    if (parsed.data.status === "DELIVERED") {
      updateData.actualDelivery = new Date();
    }

    const updated = await prisma.shipment.update({
      where: { id },
      data: updateData,
    });

    await prisma.shipmentStatusHistory.create({
      data: {
        shipmentId: id,
        status: parsed.data.status,
        changedById: userId,
        notes: parsed.data.notes ?? undefined,
      },
    });

    await prisma.notification.create({
      data: {
        userId: shipment.createdById,
        title: "Shipment status updated",
        message: `Shipment ${shipment.referenceNumber} is now ${parsed.data.status}.${parsed.data.notes ? ` ${parsed.data.notes}` : ""}`,
        type: "SHIPMENT_DELAYED",
        relatedId: id,
        relatedType: "Shipment",
      },
    });

    await createNotificationForRoles(
      ["OPERATIONS_STAFF", "ADMIN"],
      "Shipment status updated",
      `Shipment ${shipment.referenceNumber} is now ${parsed.data.status}.`,
      "SHIPMENT_DELAYED",
      id,
      "Shipment"
    );

    await createAuditLog(
      userId,
      "UPDATE_STATUS",
      "Shipment",
      id,
      { status: shipment.status },
      { status: parsed.data.status },
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/shipments/[id]/status:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update status" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "OPERATIONS_STAFF"],
});
