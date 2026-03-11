import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { getShipmentsImportTemplateBuffer } from "@/lib/excel";

async function getHandler() {
  try {
    const buffer = await getShipmentsImportTemplateBuffer();
    const filename = "shipments.xlsx";
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/templates/shipments:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to generate template" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "OPERATIONS_STAFF"],
});
