import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { addShipmentCommentSchema } from "@/lib/validations";

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

    const comments = await prisma.shipmentComment.findMany({
      where: { shipmentId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(comments);
  } catch (error) {
    console.error("GET /api/shipments/[id]/comments:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to list comments" },
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
    const parsed = addShipmentCommentSchema.safeParse(body);
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
      select: { id: true },
    });
    if (!shipment) {
      return NextResponse.json(
        { error: "Not Found", message: "Shipment not found" },
        { status: 404 }
      );
    }

    const comment = await prisma.shipmentComment.create({
      data: {
        shipmentId: id,
        userId,
        content: parsed.data.content,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("POST /api/shipments/[id]/comments:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to add comment" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
