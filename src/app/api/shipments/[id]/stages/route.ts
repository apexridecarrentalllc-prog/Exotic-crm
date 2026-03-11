import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { shipmentStageInputSchema, bulkStagesUpdateSchema } from "@/lib/validations";

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
      select: { id: true },
    });
    if (!shipment) {
      return NextResponse.json(
        { error: "Not Found", message: "Shipment not found" },
        { status: 404 }
      );
    }

    const stages = await prisma.shipmentStage.findMany({
      where: { shipmentId: id },
      include: { company: true },
      orderBy: { stageOrder: "asc" },
    });
    return NextResponse.json(stages);
  } catch (error) {
    console.error("GET /api/shipments/[id]/stages:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to list stages" },
      { status: 500 }
    );
  }
}

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
    const parsed = shipmentStageInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad Request", message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { stages: { select: { stageOrder: true } } },
    });
    if (!shipment) {
      return NextResponse.json(
        { error: "Not Found", message: "Shipment not found" },
        { status: 404 }
      );
    }

    const maxOrder = shipment.stages.length > 0
      ? Math.max(...shipment.stages.map((s) => s.stageOrder))
      : -1;
    const stageOrder = parsed.data.stageOrder ?? maxOrder + 1;

    const company = await prisma.company.findUnique({
      where: { id: parsed.data.companyId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json(
        { error: "Bad Request", message: "Company not found" },
        { status: 400 }
      );
    }

    const stage = await prisma.shipmentStage.create({
      data: {
        shipmentId: id,
        companyId: parsed.data.companyId,
        stageName: parsed.data.stageName,
        stageOrder,
        status: "PENDING",
        notes: parsed.data.notes ?? undefined,
      },
      include: { company: true },
    });
    return NextResponse.json(stage, { status: 201 });
  } catch (error) {
    console.error("POST /api/shipments/[id]/stages:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to add stage" },
      { status: 500 }
    );
  }
}

async function putHandler(
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
    const parsed = bulkStagesUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad Request", message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!shipment) {
      return NextResponse.json(
        { error: "Not Found", message: "Shipment not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction(
      parsed.data.stages.map((st, index) =>
        st.id
          ? prisma.shipmentStage.update({
              where: { id: st.id, shipmentId: id },
              data: {
                stageName: st.stageName,
                companyId: st.companyId,
                stageOrder: index,
                notes: st.notes ?? undefined,
              },
            })
          : prisma.shipmentStage.create({
              data: {
                shipmentId: id,
                stageName: st.stageName,
                companyId: st.companyId,
                stageOrder: index,
                status: "PENDING",
                notes: st.notes ?? undefined,
              },
            })
      )
    );

    const stages = await prisma.shipmentStage.findMany({
      where: { shipmentId: id },
      include: { company: true },
      orderBy: { stageOrder: "asc" },
    });
    return NextResponse.json(stages);
  } catch (error) {
    console.error("PUT /api/shipments/[id]/stages:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update stages" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "OPERATIONS_STAFF"],
});
export const PUT = withAuth(putHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "OPERATIONS_STAFF"],
});
