import { NextRequest, NextResponse } from "next/server";
import { checkOverdueInvoices, checkStuckShipments, checkMissingDocuments } from "@/lib/alert-checker";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    ?? request.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [overdue, stuck, missing] = await Promise.all([
      checkOverdueInvoices(),
      checkStuckShipments(),
      checkMissingDocuments(),
    ]);

    return NextResponse.json({
      ok: true,
      notificationsCreated: {
        overdueInvoices: overdue,
        stuckShipments: stuck,
        missingDocuments: missing,
      },
      total: overdue + stuck + missing,
    });
  } catch (error) {
    console.error("GET /api/cron/alerts:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Alert check failed" },
      { status: 500 }
    );
  }
}
