import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { generateStatementPdfBuffer } from "@/lib/pdf/generate-statement-pdf";

async function getHandler(
  request: NextRequest,
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
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("from") ?? undefined;
    const toDate = searchParams.get("to") ?? undefined;

    const buffer = await generateStatementPdfBuffer(companyId, { fromDate, toDate });
    const filename = `statement-of-account-${companyId.slice(-6)}.pdf`;

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/companies/[id]/statement/pdf:", error);
    const message = error instanceof Error ? error.message : "Failed to generate statement PDF";
    return NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
