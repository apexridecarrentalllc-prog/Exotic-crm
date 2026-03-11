import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { sendMonthlyReportEmail } from "@/lib/email";
import { buildReportWorkbook, buildReportSummaryHtml, REPORT_TYPES } from "@/lib/reports/build-excel";

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const reportType = body.reportType as string;
    const recipients = Array.isArray(body.recipients) ? body.recipients as string[] : [];
    const startDate = body.startDate ?? "";
    const endDate = body.endDate ?? "";

    if (!reportType || !REPORT_TYPES.includes(reportType as (typeof REPORT_TYPES)[number])) {
      return NextResponse.json(
        { error: "Bad Request", message: "Valid reportType is required" },
        { status: 400 }
      );
    }
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "Bad Request", message: "At least one recipient email is required" },
        { status: 400 }
      );
    }
    const validEmails = recipients.filter((e: string) => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (validEmails.length === 0) {
      return NextResponse.json(
        { error: "Bad Request", message: "Valid recipient emails required" },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({ reportType });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

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
    const summaryHtml = buildReportSummaryHtml(reportType, data);
    const now = new Date();
    const month = now.toLocaleString("default", { month: "long" });
    const year = String(now.getFullYear());
    const reportUrl = `${baseUrl}/reports`;
    const filename = `report-${reportType}-${now.toISOString().slice(0, 10)}.xlsx`;

    await sendMonthlyReportEmail({
      recipients: validEmails,
      month,
      year,
      summaryHtml,
      reportUrl,
      attachments: [
        { filename, content: buffer, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Report sent successfully",
      recipientCount: validEmails.length,
    });
  } catch (error) {
    console.error("POST /api/reports/send:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to send report email" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler, {
  roles: ["SUPER_ADMIN", "ADMIN"],
});
