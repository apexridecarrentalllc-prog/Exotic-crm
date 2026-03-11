import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { buildReportWorkbook, REPORT_TYPES } from "@/lib/reports/build-excel";

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const reportType = body.reportType as string;
    const format = body.format || "excel";
    if (format !== "excel") {
      return NextResponse.json(
        { error: "Bad Request", message: "Only format 'excel' is supported" },
        { status: 400 }
      );
    }
    if (!reportType || !REPORT_TYPES.includes(reportType as (typeof REPORT_TYPES)[number])) {
      return NextResponse.json(
        { error: "Bad Request", message: "Valid reportType is required" },
        { status: 400 }
      );
    }

    const startDate = body.startDate ?? "";
    const endDate = body.endDate ?? "";
    const companyId = body.companyId ?? "";
    const params = new URLSearchParams({
      reportType,
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(companyId && { companyId }),
    });

    const baseUrl = request.nextUrl?.origin ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const cookie = request.headers.get("cookie") ?? "";
    const res = await fetch(`${baseUrl}/api/reports?${params}`, {
      headers: { cookie },
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: j.error ?? "Report fetch failed", message: j.message },
        { status: res.status }
      );
    }
    const data = (await res.json()) as Record<string, unknown>;

    const buffer = buildReportWorkbook(reportType, data);
    const filename = `report-${reportType}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("POST /api/reports/export:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Export failed" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
