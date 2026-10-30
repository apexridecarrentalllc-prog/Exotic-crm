import { NextRequest, NextResponse } from "next/server";
import { withAuth, createAuditLog } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { expenseSchema } from "@/lib/validations";
import { OBJECT_ID_RE, expenseInclude, serializeExpense } from "@/lib/expense-utils";

function badId() {
  return NextResponse.json({ error: "Not Found", message: "Expense not found" }, { status: 404 });
}

function snapshot(e: { expenseNumber: string; category: string; amount: number; expenseDate: Date; shipmentId: string | null; description: string; vendor: string | null; method: string }) {
  return {
    expenseNumber: e.expenseNumber,
    category: e.category,
    amount: toNum(e.amount),
    expenseDate: e.expenseDate.toISOString().slice(0, 10),
    shipmentId: e.shipmentId,
    description: e.description,
    vendor: e.vendor,
    method: e.method,
  };
}

async function getHandler(_request: NextRequest, context: { params?: Record<string, string> }) {
  const id = context.params?.id;
  if (!id || !OBJECT_ID_RE.test(id)) return badId();
  try {
    const expense = await prisma.expense.findUnique({ where: { id }, include: expenseInclude });
    if (!expense) return badId();
    return NextResponse.json(serializeExpense(expense));
  } catch (error) {
    console.error("GET /api/expenses/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error", message: "Failed to fetch expense" }, { status: 500 });
  }
}

async function putHandler(request: NextRequest, context: { params?: Record<string, string> }) {
  const id = context.params?.id;
  if (!id || !OBJECT_ID_RE.test(id)) return badId();
  try {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) return badId();

    const body = await request.json().catch(() => null);
    const parsed = expenseSchema.safeParse(body);
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

    const { shipmentId, vendor, ...rest } = parsed.data;
    if (shipmentId) {
      const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId }, select: { id: true } });
      if (!shipment) {
        return NextResponse.json({ error: "Not Found", message: "Shipment not found" }, { status: 404 });
      }
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: { ...rest, vendor: vendor || null, shipmentId: shipmentId || null },
      include: expenseInclude,
    });

    await createAuditLog(
      userId,
      "UPDATE",
      "Expense",
      id,
      snapshot(existing),
      snapshot(updated),
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    return NextResponse.json(serializeExpense(updated));
  } catch (error) {
    console.error("PUT /api/expenses/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error", message: "Failed to update expense" }, { status: 500 });
  }
}

async function deleteHandler(request: NextRequest, context: { params?: Record<string, string> }) {
  const id = context.params?.id;
  if (!id || !OBJECT_ID_RE.test(id)) return badId();
  try {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) return badId();

    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.expense.delete({ where: { id } });

    await createAuditLog(
      userId,
      "DELETE",
      "Expense",
      id,
      snapshot(existing),
      undefined,
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/expenses/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error", message: "Failed to delete expense" }, { status: 500 });
  }
}

const FINANCE_ROLES: ("SUPER_ADMIN" | "ADMIN" | "ACCOUNTS_MANAGER")[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "ACCOUNTS_MANAGER",
];

export const GET = withAuth(getHandler, { roles: FINANCE_ROLES });
export const PUT = withAuth(putHandler, { roles: FINANCE_ROLES });
// Deleting follows the same rule as deleting invoices.
export const DELETE = withAuth(deleteHandler, { roles: ["SUPER_ADMIN", "ADMIN"] });
