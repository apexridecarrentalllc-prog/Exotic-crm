import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";

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

    const invoices = await prisma.invoice.findMany({
      where: { companyId },
      orderBy: { issueDate: "desc" },
      include: {
        shipment: { select: { id: true, referenceNumber: true, status: true } },
      },
    });

    const data = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      totalAmount: toNum(inv.totalAmount),
      paidAmount: toNum(inv.paidAmount),
      balanceAmount: toNum(inv.balanceAmount),
      currency: inv.currency,
      shipment: inv.shipment,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/companies/[id]/invoices:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
