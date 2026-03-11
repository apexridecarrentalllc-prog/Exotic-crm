import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createNotificationForRole } from "@/lib/notifications";
import { updateShipmentStageSchema } from "@/lib/validations";

async function patchHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const id = context.params?.id;
  const stageId = context.params?.stageId;
  if (!id || !stageId) {
    return NextResponse.json(
      { error: "Bad Request", message: "Shipment ID and Stage ID are required" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const parsed = updateShipmentStageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad Request", message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const stage = await prisma.shipmentStage.findFirst({
      where: { id: stageId, shipmentId: id },
    });
    if (!stage) {
      return NextResponse.json(
        { error: "Not Found", message: "Stage not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.stageName !== undefined) data.stageName = parsed.data.stageName;
    if (parsed.data.companyId !== undefined) data.companyId = parsed.data.companyId;
    if (parsed.data.stageOrder !== undefined) data.stageOrder = parsed.data.stageOrder;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.startDate !== undefined) data.startDate = parsed.data.startDate;
    if (parsed.data.completedDate !== undefined) data.completedDate = parsed.data.completedDate;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;

    const updated = await prisma.shipmentStage.update({
      where: { id: stageId },
      data,
      include: { company: true },
    });

    if (parsed.data.status === "COMPLETED") {
      const shipment = await prisma.shipment.findUnique({
        where: { id },
        select: { referenceNumber: true },
      });
      if (shipment) {
        await createNotificationForRole(
          "ACCOUNTS_MANAGER",
          "Stage marked complete",
          `Stage "${updated.stageName}" completed for shipment ${shipment.referenceNumber}. Consider creating an invoice.`,
          "GENERAL",
          id,
          "Shipment"
        );
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/shipments/[id]/stages/[stageId]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update stage" },
      { status: 500 }
    );
  }
}

async function deleteHandler(
  _request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const id = context.params?.id;
  const stageId = context.params?.stageId;
  if (!id || !stageId) {
    return NextResponse.json(
      { error: "Bad Request", message: "Shipment ID and Stage ID are required" },
      { status: 400 }
    );
  }

  try {
    const stage = await prisma.shipmentStage.findFirst({
      where: { id: stageId, shipmentId: id },
    });
    if (!stage) {
      return NextResponse.json(
        { error: "Not Found", message: "Stage not found" },
        { status: 404 }
      );
    }

    if (stage.status !== "PENDING") {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "Can only remove stages that are PENDING. Update status to PENDING first or leave as is.",
        },
        { status: 409 }
      );
    }

    await prisma.shipmentStage.delete({
      where: { id: stageId },
    });
    return NextResponse.json({ success: true, id: stageId });
  } catch (error) {
    console.error("DELETE /api/shipments/[id]/stages/[stageId]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to delete stage" },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(patchHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "OPERATIONS_STAFF"],
});
export const DELETE = withAuth(deleteHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "OPERATIONS_STAFF"],
});
