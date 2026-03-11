import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

async function getHandler(
  _request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const companyId = context.params?.id;
  if (!companyId) {
    return NextResponse.json(
      { error: "Bad Request", message: "Company ID is required" },
      { status: 400 }
    );
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json(
        { error: "Not Found", message: "Company not found" },
        { status: 404 }
      );
    }

    const invoiceShipments = await prisma.invoice.findMany({
      where: { companyId },
      select: { shipmentId: true },
      distinct: ["shipmentId"],
    });
    const shipmentIds = invoiceShipments.map((i) => i.shipmentId).filter(Boolean) as string[];

    if (shipmentIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const shipments = await prisma.shipment.findMany({
      where: { id: { in: shipmentIds } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: shipments });
  } catch (error) {
    console.error("GET /api/companies/[id]/shipments:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch shipments" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
