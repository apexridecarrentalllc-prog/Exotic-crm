import { NextRequest, NextResponse } from "next/server";
import { withAuth, createAuditLog } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { recordAdvancePaymentSchema } from "@/lib/validations";

const ADVANCE_CURRENCY = "AED";

/** Loads an advance payment, or returns the error response to send. */
async function findAdvance(id: string | undefined) {
  if (!id) {
    return {
      error: NextResponse.json(
        { error: "Bad Request", message: "Advance payment ID is required" },
        { status: 400 }
      ),
    };
  }
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { company: { select: { name: true } } },
  });
  if (!payment || !payment.isAdvance) {
    return {
      error: NextResponse.json(
        { error: "Not Found", message: "Advance payment not found" },
        { status: 404 }
      ),
    };
  }
  if (payment.invoiceId) {
    return {
      error: NextResponse.json(
        { error: "Bad Request", message: "This advance is applied to an invoice and cannot be changed" },
        { status: 400 }
      ),
    };
  }
  return { payment };
}

async function putHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  try {
    const found = await findAdvance(context.params?.id);
    if (found.error) return found.error;
    const existing = found.payment;

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

    if (parsed.data.companyId !== existing.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: parsed.data.companyId },
        select: { id: true, isActive: true },
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
    }

    const updated = await prisma.payment.update({
      where: { id: existing.id },
      data: {
        companyId: parsed.data.companyId,
        amount: parsed.data.amount,
        currency: ADVANCE_CURRENCY,
        paymentDate: parsed.data.paymentDate,
        notes: parsed.data.notes ?? null,
      },
    });

    await createAuditLog(
      userId,
      "UPDATE",
      "Payment",
      existing.id,
      {
        companyId: existing.companyId,
        amount: toNum(existing.amount),
        paymentDate: existing.paymentDate.toISOString().slice(0, 10),
        notes: existing.notes,
      },
      {
        companyId: updated.companyId,
        amount: toNum(updated.amount),
        paymentDate: updated.paymentDate.toISOString().slice(0, 10),
        notes: updated.notes,
      },
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    return NextResponse.json({ ...updated, amount: toNum(updated.amount) });
  } catch (error) {
    console.error("PUT /api/transactions/advance/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update advance payment" },
      { status: 500 }
    );
  }
}

async function deleteHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  try {
    const found = await findAdvance(context.params?.id);
    if (found.error) return found.error;
    const existing = found.payment;

    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.payment.delete({ where: { id: existing.id } });

    await createAuditLog(
      userId,
      "DELETE",
      "Payment",
      existing.id,
      {
        companyId: existing.companyId,
        amount: toNum(existing.amount),
        referenceNumber: existing.referenceNumber,
        isAdvance: true,
      },
      undefined,
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/transactions/advance/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to delete advance payment" },
      { status: 500 }
    );
  }
}

export const PUT = withAuth(putHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
// Deleting a financial record is limited to admins, like invoice deletion.
export const DELETE = withAuth(deleteHandler, {
  roles: ["SUPER_ADMIN", "ADMIN"],
});
