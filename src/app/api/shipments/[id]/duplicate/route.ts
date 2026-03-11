import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { generateShipmentRef } from "@/lib/shipment-ref";

async function postHandler(
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
    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const source = await prisma.shipment.findUnique({
      where: { id },
      include: { stages: true },
    });
    if (!source) {
      return NextResponse.json(
        { error: "Not Found", message: "Shipment not found" },
        { status: 404 }
      );
    }

    const ref = await generateShipmentRef(source.type);
    const now = new Date();

    const shipment = await prisma.shipment.create({
      data: {
        referenceNumber: ref,
        type: source.type,
        status: "ORDER_CREATED",
        origin: source.origin,
        destination: source.destination,
        goodsDescription: source.goodsDescription,
        containerNumber: source.containerNumber,
        awbNumber: source.awbNumber,
        weight: source.weight,
        volume: source.volume,
        cargoValue: source.cargoValue,
        currency: source.currency,
        isUrgent: source.isUrgent,
        internalNotes: source.internalNotes,
        orderDate: now,
        expectedDelivery: undefined,
        actualDelivery: undefined,
        createdById: userId,
        stages: {
          create: source.stages.map((s) => ({
            companyId: s.companyId,
            stageName: s.stageName,
            stageOrder: s.stageOrder,
            status: "PENDING" as const,
            notes: s.notes,
          })),
        },
      },
      include: { stages: { include: { company: true } } },
    });

    await prisma.shipmentStatusHistory.create({
      data: {
        shipmentId: shipment.id,
        status: "ORDER_CREATED",
        changedById: userId,
        notes: "Cloned from " + source.referenceNumber,
      },
    });

    return NextResponse.json({ id: shipment.id, referenceNumber: shipment.referenceNumber }, { status: 201 });
  } catch (error) {
    console.error("POST /api/shipments/[id]/duplicate:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to duplicate shipment" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "OPERATIONS_STAFF"],
});
