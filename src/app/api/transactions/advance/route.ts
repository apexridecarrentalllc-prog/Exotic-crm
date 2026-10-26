import { NextRequest, NextResponse } from "next/server";
import { withAuth, createAuditLog } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { recordAdvancePaymentSchema } from "@/lib/validations";
import { generateAdvanceNumber } from "@/lib/invoice-number";
import { createNotificationForRoles } from "@/lib/notifications";

/** Advance payments are always recorded and shown in AED. */
const ADVANCE_CURRENCY = "AED";

async function getHandler() {
  try {
    const payments = await prisma.payment.findMany({
      where: { isAdvance: true },
      orderBy: { paymentDate: "desc" },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    const data = payments.map((p) => ({
      id: p.id,
      companyId: p.companyId,
      companyName: p.company.name,
      amount: toNum(p.amount),
      currency: ADVANCE_CURRENCY,
      paymentDate: p.paymentDate.toISOString().slice(0, 10),
      method: p.method,
      referenceNumber: p.referenceNumber,
      notes: p.notes,
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

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = recordAdvancePaymentSchema.safeParse(body);
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

    const company = await prisma.company.findUnique({
      where: { id: parsed.data.companyId },
      select: { id: true, name: true, isActive: true },
    });
    if (!company) {
      return NextResponse.json(
        { error: "Not Found", message: "Company not found" },
        { status: 404 }
      );
    }
    if (!company.isActive) {
      return NextResponse.json(
        { error: "Bad Request", message: "Company is inactive" },
        { status: 400 }
      );
    }

    const referenceNumber = await generateAdvanceNumber();

    // Advance payments are cash-only and not linked to an invoice yet.
    const payment = await prisma.payment.create({
      data: {
        companyId: company.id,
        recordedById: userId,
        amount: parsed.data.amount,
        currency: ADVANCE_CURRENCY,
        paymentDate: parsed.data.paymentDate,
        method: "CASH",
        referenceNumber,
        notes: parsed.data.notes ?? undefined,
        isAdvance: true,
      },
    });

    await createAuditLog(
      userId,
      "CREATE",
      "Payment",
      payment.id,
      undefined,
      { companyId: company.id, amount: parsed.data.amount, method: "CASH", isAdvance: true, referenceNumber },
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    await createNotificationForRoles(
      ["ACCOUNTS_MANAGER", "ADMIN"],
      "Advance payment recorded",
      `Advance payment of ${parsed.data.amount} ${ADVANCE_CURRENCY} recorded for ${company.name} (${referenceNumber}).`,
      "GENERAL",
      payment.id,
      "Payment"
    );

    return NextResponse.json(
      { ...payment, amount: toNum(payment.amount), exchangeRate: toNum(payment.exchangeRate) },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/transactions/advance:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to record advance payment" },
      { status: 500 }
    );
  }
}

const FINANCE_ROLES: ("SUPER_ADMIN" | "ADMIN" | "ACCOUNTS_MANAGER")[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "ACCOUNTS_MANAGER",
];

export const GET = withAuth(getHandler, { roles: FINANCE_ROLES });
export const POST = withAuth(postHandler, { roles: FINANCE_ROLES });
