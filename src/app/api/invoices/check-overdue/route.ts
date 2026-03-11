import { NextRequest, NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/invoices/check-overdue
 * Internal/cron: mark all invoices where dueDate < now and status IN [SENT, PARTIALLY_PAID] as OVERDUE.
 * Creates notifications for overdue invoices.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- withAuth passes request
async function postHandler(_request: NextRequest) {
  try {
    const today = startOfDay(new Date());
    const toUpdate = await prisma.invoice.findMany({
      where: {
        dueDate: { lt: today },
        status: { in: ["SENT", "PARTIALLY_PAID"] },
      },
      select: { id: true, createdById: true, invoiceNumber: true },
    });

    if (toUpdate.length === 0) {
      return NextResponse.json({ updated: 0, notificationsCreated: 0 });
    }

    await prisma.invoice.updateMany({
      where: { id: { in: toUpdate.map((i) => i.id) } },
      data: { status: "OVERDUE" },
    });

    for (const inv of toUpdate) {
      await prisma.notification.create({
        data: {
          userId: inv.createdById,
          title: "Invoice overdue",
          message: "Invoice " + inv.invoiceNumber + " is now overdue.",
          type: "INVOICE_OVERDUE",
          relatedId: inv.id,
          relatedType: "Invoice",
        },
      });
    }

    return NextResponse.json({
      updated: toUpdate.length,
      notificationsCreated: toUpdate.length,
    });
  } catch (error) {
    console.error("POST /api/invoices/check-overdue:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to check overdue invoices" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler);
