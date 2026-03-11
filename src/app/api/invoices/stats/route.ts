import { NextResponse } from "next/server";
import { startOfMonth, startOfDay } from "date-fns";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

async function getHandler() {
  try {
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());

    const [totalInvoices, draftCount, sentCount, overdueCount, paidThisMonth, outstandingResult] =
      await Promise.all([
        prisma.invoice.count({ where: { status: { not: "CANCELLED" } } }),
        prisma.invoice.count({ where: { status: "DRAFT" } }),
        prisma.invoice.count({ where: { status: "SENT" } }),
        prisma.invoice.count({
          where: {
            dueDate: { lt: today },
            status: { in: ["SENT", "PARTIALLY_PAID"] },
          },
        }),
        prisma.payment.aggregate({
          where: { paymentDate: { gte: monthStart } },
          _sum: { amount: true },
        }),
        prisma.invoice.aggregate({
          where: { status: { notIn: ["CANCELLED", "PAID"] } },
          _sum: { balanceAmount: true },
        }),
      ]);

    const paidThisMonthTotal = Number(paidThisMonth._sum.amount ?? 0);
    const outstandingTotal = Number(outstandingResult._sum.balanceAmount ?? 0);

    return NextResponse.json({
      totalInvoices,
      draftCount,
      sentCount,
      overdueCount,
      paidThisMonth: paidThisMonthTotal,
      outstandingTotal,
    });
  } catch (error) {
    console.error("GET /api/invoices/stats:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch invoice stats" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
