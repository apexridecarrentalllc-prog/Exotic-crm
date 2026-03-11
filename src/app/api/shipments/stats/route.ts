import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

async function getHandler() {
  try {
    const [active, importCount, exportCount, urgent] = await Promise.all([
      prisma.shipment.count({
        where: {
          status: { notIn: ["CLOSED", "CANCELLED"] },
        },
      }),
      prisma.shipment.count({ where: { type: "IMPORT" } }),
      prisma.shipment.count({ where: { type: "EXPORT" } }),
      prisma.shipment.count({ where: { isUrgent: true } }),
    ]);

    return NextResponse.json({
      active,
      importCount,
      exportCount,
      urgent,
    });
  } catch (error) {
    console.error("GET /api/shipments/stats:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
