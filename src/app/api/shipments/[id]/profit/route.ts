import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { buildShipmentProfit } from "@/lib/reports/profit-loss";
import { OBJECT_ID_RE } from "@/lib/expense-utils";

async function getHandler(_request: Request, context: { params?: Record<string, string> }) {
  const id = context.params?.id;
  if (!id || !OBJECT_ID_RE.test(id)) {
    return NextResponse.json({ error: "Not Found", message: "Shipment not found" }, { status: 404 });
  }
  try {
    const shipment = await prisma.shipment.findUnique({ where: { id }, select: { id: true } });
    if (!shipment) {
      return NextResponse.json({ error: "Not Found", message: "Shipment not found" }, { status: 404 });
    }
    return NextResponse.json(await buildShipmentProfit(id));
  } catch (error) {
    console.error("GET /api/shipments/[id]/profit:", error);
    return NextResponse.json({ error: "Internal Server Error", message: "Failed to load profit" }, { status: 500 });
  }
}

export const GET = withAuth(getHandler, { roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"] });
