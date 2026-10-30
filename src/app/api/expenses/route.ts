import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withAuth, createAuditLog } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { expenseSchema } from "@/lib/validations";
import { generateExpenseNumber } from "@/lib/invoice-number";
import { EXPENSE_CATEGORIES, EXPENSE_METHODS } from "@/lib/expense-categories";
import { OBJECT_ID_RE, parseDayStart, parseDayEnd, expenseInclude, serializeExpense } from "@/lib/expense-utils";
import { escapeRegex } from "@/lib/search";

async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10) || 10));
    const search = searchParams.get("search")?.trim();
    const category = searchParams.get("category");
    const method = searchParams.get("method");
    const shipmentId = searchParams.get("shipmentId");
    const from = parseDayStart(searchParams.get("from"));
    const to = parseDayEnd(searchParams.get("to"));

    const where: Prisma.ExpenseWhereInput = {};
    if (category && (EXPENSE_CATEGORIES as readonly string[]).includes(category)) where.category = category;
    if (method && (EXPENSE_METHODS as readonly string[]).includes(method)) {
      where.method = method as (typeof EXPENSE_METHODS)[number];
    }
    if (shipmentId === "none") where.shipmentId = null;
    else if (shipmentId && OBJECT_ID_RE.test(shipmentId)) where.shipmentId = shipmentId;
    if (from || to) where.expenseDate = { ...(from && { gte: from }), ...(to && { lte: to }) };
    if (search) {
      where.OR = [
        { description: { contains: escapeRegex(search), mode: "insensitive" } },
        { vendor: { contains: escapeRegex(search), mode: "insensitive" } },
        { expenseNumber: { contains: escapeRegex(search), mode: "insensitive" } },
        { shipment: { referenceNumber: { contains: escapeRegex(search), mode: "insensitive" } } },
      ];
    }

    const [rows, total, sum] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: expenseInclude,
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    return NextResponse.json({
      data: rows.map(serializeExpense),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      // The total follows every filter, across all pages (not just the rows shown).
      summary: { totalAmount: toNum(sum._sum.amount), count: total },
    });
  } catch (error) {
    console.error("GET /api/expenses:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

async function postHandler(request: NextRequest) {
  try {
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

    const expenseNumber = await generateExpenseNumber();
    const expense = await prisma.expense.create({
      data: {
        ...rest,
        expenseNumber,
        currency: "AED",
        vendor: vendor || null,
        shipmentId: shipmentId || null,
        recordedById: userId,
      },
      include: expenseInclude,
    });

    await createAuditLog(
      userId,
      "CREATE",
      "Expense",
      expense.id,
      undefined,
      {
        expenseNumber,
        category: expense.category,
        amount: toNum(expense.amount),
        expenseDate: expense.expenseDate.toISOString().slice(0, 10),
        shipmentId: expense.shipmentId,
      },
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    return NextResponse.json(serializeExpense(expense), { status: 201 });
  } catch (error) {
    console.error("POST /api/expenses:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to record expense" },
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
