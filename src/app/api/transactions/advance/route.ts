import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";

async function getHandler() {
  try {
    const payments = await prisma.payment.findMany({
      where: { isAdvance: true },
      orderBy: { paymentDate: "desc" },
      include: {
        company: { select: { id: true, name: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
    });

    const data = payments.map((p) => ({
      id: p.id,
      companyId: p.companyId,
      companyName: p.company.name,
      amount: toNum(p.amount),
      currency: p.currency,
      paymentDate: p.paymentDate.toISOString().slice(0, 10),
      method: p.method,
      referenceNumber: p.referenceNumber,
      status: p.invoiceId ? "Applied" : "Pending",
      invoiceNumber: p.invoice?.invoiceNumber ?? null,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/transactions/advance:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch advance payments" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
