import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/auth-helpers";
import { createNotificationForRoles } from "@/lib/notifications";
import { recordPaymentSchema } from "@/lib/validations";
import { toNum } from "@/lib/utils";

async function getHandler(
  _request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json(
      { error: "Bad Request", message: "Invoice ID is required" },
      { status: 400 }
    );
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!invoice) {
      return NextResponse.json(
        { error: "Not Found", message: "Invoice not found" },
        { status: 404 }
      );
    }

    const payments = await prisma.payment.findMany({
      where: { invoiceId: id },
      orderBy: { paymentDate: "desc" },
      include: { recordedBy: { select: { id: true, name: true } } },
    });

    const data = payments.map((p) => ({
      ...p,
      amount: toNum(p.amount),
      exchangeRate: toNum(p.exchangeRate),
    }));
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/invoices/[id]/payments:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to list payments" },
      { status: 500 }
    );
  }
}

async function postHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json(
      { error: "Bad Request", message: "Invoice ID is required" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const parsed = recordPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad Request", message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { company: true, shipment: true },
    });
    if (!invoice) {
      return NextResponse.json(
        { error: "Not Found", message: "Invoice not found" },
        { status: 404 }
      );
    }

    const balanceAmount = toNum(invoice.balanceAmount);
    if (parsed.data.amount > balanceAmount) {
      return NextResponse.json(
        { error: "Bad Request", message: "Amount cannot exceed remaining balance " + balanceAmount },
        { status: 400 }
      );
    }

    const paidAmount = toNum(invoice.paidAmount);
    const newPaidAmount = paidAmount + parsed.data.amount;
    const totalAmount = toNum(invoice.totalAmount);
    const newBalanceAmount = totalAmount - newPaidAmount;
    const newStatus = newBalanceAmount <= 0 ? "PAID" : "PARTIALLY_PAID";

    const payment = await prisma.payment.create({
      data: {
        invoiceId: id,
        companyId: invoice.companyId,
        shipmentId: invoice.shipmentId,
        recordedById: userId,
        amount: parsed.data.amount,
        currency: invoice.currency,
        paymentDate: parsed.data.paymentDate,
        method: parsed.data.method,
        referenceNumber: parsed.data.referenceNumber ?? undefined,
        bankName: parsed.data.bankName ?? undefined,
        notes: parsed.data.notes ?? undefined,
      },
    });

    await prisma.invoice.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        balanceAmount: newBalanceAmount,
        status: newStatus,
      },
    });

    await createAuditLog(
      userId,
      "CREATE",
      "Payment",
      payment.id,
      undefined,
      { invoiceId: id, amount: parsed.data.amount },
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    await prisma.notification.create({
      data: {
        userId: invoice.createdById,
        title: "Payment received",
        message: "Payment of " + parsed.data.amount + " " + invoice.currency + " recorded for invoice " + invoice.invoiceNumber + ".",
        type: "GENERAL",
        relatedId: id,
        relatedType: "Invoice",
      },
    });

    await createNotificationForRoles(
      ["ACCOUNTS_MANAGER", "ADMIN"],
      "Payment recorded",
      `Payment of ${parsed.data.amount} ${invoice.currency} recorded for invoice ${invoice.invoiceNumber}.`,
      "GENERAL",
      id,
      "Invoice"
    );

    const updated = await prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: true,
        payments: true,
        company: true,
        shipment: true,
      },
    });
    const out = updated!;
    return NextResponse.json({
      ...out,
      subtotal: toNum(out.subtotal),
      taxAmount: toNum(out.taxAmount),
      totalAmount: toNum(out.totalAmount),
      paidAmount: toNum(out.paidAmount),
      balanceAmount: toNum(out.balanceAmount),
    });
  } catch (error) {
    console.error("POST /api/invoices/[id]/payments:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to record payment" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
