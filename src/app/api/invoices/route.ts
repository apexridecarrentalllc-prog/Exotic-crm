import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/auth-helpers";
import { createInvoiceSchema } from "@/lib/validations";
import { toNum } from "@/lib/utils";
import { generateInvoiceNumber } from "@/lib/invoice-number";
import { createNotificationForRole } from "@/lib/notifications";
import { parseISO, isValid, startOfDay } from "date-fns";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const SORT_FIELDS = ["issueDate", "dueDate", "createdAt", "invoiceNumber", "totalAmount"] as const;
const SORT_ORDERS = ["asc", "desc"] as const;

async function getHandler(request: NextRequest) {
  try {
    const session = await (await import("@/lib/auth")).auth();
    const role = session?.user?.role as string | undefined;
    const limitFinancialData = role === "OPERATIONS_STAFF";

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || undefined;
    const status = searchParams.get("status") || undefined;
    const companyId = searchParams.get("companyId") || undefined;
    const shipmentId = searchParams.get("shipmentId") || undefined;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const overdueOnly = searchParams.get("overdueOnly") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? String(DEFAULT_PAGE), 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)));
    const sortBy = SORT_FIELDS.includes(searchParams.get("sortBy") as (typeof SORT_FIELDS)[number])
      ? (searchParams.get("sortBy") as (typeof SORT_FIELDS)[number])
      : "createdAt";
    const sortOrder = SORT_ORDERS.includes(searchParams.get("sortOrder") as (typeof SORT_ORDERS)[number])
      ? (searchParams.get("sortOrder") as (typeof SORT_ORDERS)[number])
      : "desc";

    const where: Prisma.InvoiceWhereInput = {};
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { company: { name: { contains: search, mode: "insensitive" } } },
        { shipment: { referenceNumber: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (status) where.status = status as Prisma.EnumInvoiceStatusFilter;
    if (companyId) where.companyId = companyId;
    if (shipmentId) where.shipmentId = shipmentId;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDateParam) {
      const d = parseISO(startDateParam);
      if (isValid(d)) dateFilter.gte = startOfDay(d);
    }
    if (endDateParam) {
      const d = parseISO(endDateParam);
      if (isValid(d)) dateFilter.lte = d;
    }
    if (Object.keys(dateFilter).length > 0) where.dueDate = dateFilter;

    if (overdueOnly) {
      where.dueDate = { ...((where.dueDate as object) || {}), lt: startOfDay(new Date()) };
      where.status = { in: ["SENT", "PARTIALLY_PAID"] };
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          company: { select: { id: true, name: true } },
          shipment: { select: { id: true, referenceNumber: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    const today = startOfDay(new Date());
    const data = invoices.map((inv) => {
      const paidAmount = limitFinancialData ? undefined : toNum(inv.paidAmount);
      const totalAmount = limitFinancialData ? undefined : toNum(inv.totalAmount);
      const balanceAmount = limitFinancialData ? undefined : toNum(inv.balanceAmount);
      const isOverdue =
        inv.status === "SENT" || inv.status === "PARTIALLY_PAID"
          ? new Date(inv.dueDate) < today
          : false;
      return {
        ...inv,
        paidAmount,
        balanceAmount,
        totalAmount,
        isOverdue,
        companyName: inv.company.name,
        shipmentReference: inv.shipment.referenceNumber,
      };
    });

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/invoices:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to list invoices" },
      { status: 500 }
    );
  }
}

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createInvoiceSchema.safeParse(body);
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

    const { shipmentId, companyId, dueDate, currency, taxRate, withholdingTax, notes, lineItems } = parsed.data;

    let subtotal = 0;
    const lineItemData = lineItems.map((line, i) => {
      const amount = line.quantity * line.unitRate;
      subtotal += amount;
      return {
        description: line.description,
        quantity: line.quantity,
        unitRate: line.unitRate,
        amount,
        taxRate: line.taxRate ?? 0,
        sortOrder: i,
      };
    });

    const taxAmount = subtotal * ((taxRate ?? 0) / 100);
    const totalAmount = subtotal + taxAmount - (withholdingTax ?? 0);
    const balanceAmount = totalAmount;

    const invoiceNumber = await generateInvoiceNumber();
    const issueDate = new Date();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        shipmentId,
        companyId,
        createdById: userId,
        status: "DRAFT",
        issueDate,
        dueDate,
        currency: currency ?? "PKR",
        exchangeRate: 1,
        subtotal,
        taxRate: taxRate ?? 0,
        taxAmount,
        withholdingTax: withholdingTax ?? 0,
        totalAmount,
        paidAmount: 0,
        balanceAmount,
        notes: notes ?? undefined,
        lineItems: {
          create: lineItemData.map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unitRate: line.unitRate,
            amount: line.amount,
            taxRate: line.taxRate,
            sortOrder: line.sortOrder,
          })),
        },
      },
      include: {
        lineItems: true,
        company: true,
        shipment: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog(
      userId,
      "CREATE",
      "Invoice",
      invoice.id,
      undefined,
      { invoiceNumber: invoice.invoiceNumber, companyId, shipmentId },
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    await createNotificationForRole(
      "ACCOUNTS_MANAGER",
      "Invoice created",
      `Invoice ${invoice.invoiceNumber} has been created for ${invoice.company.name}.`,
      "GENERAL",
      invoice.id,
      "Invoice"
    );

    const response = {
      ...invoice,
      subtotal: toNum(invoice.subtotal),
      taxAmount: toNum(invoice.taxAmount),
      totalAmount: toNum(invoice.totalAmount),
      paidAmount: toNum(invoice.paidAmount),
      balanceAmount: toNum(invoice.balanceAmount),
      withholdingTax: toNum(invoice.withholdingTax),
      taxRate: toNum(invoice.taxRate),
      exchangeRate: toNum(invoice.exchangeRate),
    };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("POST /api/invoices:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to create invoice" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
