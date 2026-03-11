import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/auth-helpers";
import { companySchema } from "@/lib/validations";
import { toNum } from "@/lib/utils";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const SORT_FIELDS = ["name", "createdAt", "currency"] as const;
const SORT_ORDERS = ["asc", "desc"] as const;

async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || undefined;
    const type = searchParams.get("type") || undefined;
    const isActiveParam = searchParams.get("isActive");
    const isActive =
      isActiveParam === null || isActiveParam === ""
        ? undefined
        : isActiveParam === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? String(DEFAULT_PAGE), 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)));
    const sortBy = SORT_FIELDS.includes(searchParams.get("sortBy") as (typeof SORT_FIELDS)[number])
      ? (searchParams.get("sortBy") as (typeof SORT_FIELDS)[number])
      : "createdAt";
    const sortOrder = SORT_ORDERS.includes(searchParams.get("sortOrder") as (typeof SORT_ORDERS)[number])
      ? (searchParams.get("sortOrder") as (typeof SORT_ORDERS)[number])
      : "desc";

    const where: Record<string, unknown> = {};
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    if (type) {
      where.type = { has: type };
    }
    if (typeof isActive === "boolean") {
      where.isActive = isActive;
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          contacts: { where: { isPrimary: true }, take: 1 },
          _count: { select: { invoices: true, shipmentStages: true } },
        },
      }),
      prisma.company.count({ where }),
    ]);

    const companyIds = companies.map((c) => c.id);
    const [invoiceSums, paymentSums] = await Promise.all([
      prisma.invoice.groupBy({
        by: ["companyId"],
        where: {
          companyId: { in: companyIds },
          status: { not: "CANCELLED" },
        },
        _sum: { totalAmount: true, balanceAmount: true },
      }),
      prisma.payment.groupBy({
        by: ["companyId"],
        where: { companyId: { in: companyIds } },
        _sum: { amount: true },
      }),
    ]);

    const invoiceMap = new Map(
      invoiceSums.map((i) => [
        i.companyId,
        {
          totalInvoiced: toNum(i._sum.totalAmount),
          outstanding: toNum(i._sum.balanceAmount),
        },
      ])
    );
    const paymentMap = new Map(
      paymentSums.map((p) => [p.companyId, toNum(p._sum.amount)])
    );

    const data = companies.map((c) => {
      const inv = invoiceMap.get(c.id);
      const totalInvoiced = inv?.totalInvoiced ?? 0;
      const totalPaid = paymentMap.get(c.id) ?? 0;
      const outstandingBalance = inv?.outstanding ?? 0;
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        isActive: c.isActive,
        paymentTerms: c.paymentTerms,
        currency: c.currency,
        totalInvoiced,
        totalPaid,
        outstandingBalance,
        primaryContact: c.contacts[0]
          ? {
              id: c.contacts[0].id,
              name: c.contacts[0].name,
              email: c.contacts[0].email,
              phone: c.contacts[0].phone,
              designation: c.contacts[0].designation,
            }
          : null,
        createdAt: c.createdAt,
        _count: c._count,
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
    console.error("GET /api/companies:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to list companies" },
      { status: 500 }
    );
  }
}

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = companySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad Request", message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { contacts, bankAccounts, ...companyData } = parsed.data;
    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company = await prisma.company.create({
      data: {
        name: companyData.name,
        type: companyData.type,
        address: companyData.address ?? undefined,
        city: companyData.city ?? undefined,
        country: companyData.country ?? undefined,
        notes: companyData.notes ?? undefined,
        paymentTerms: companyData.paymentTerms ?? undefined,
        currency: companyData.currency ?? "PKR",
        taxNumber: companyData.taxNumber ?? undefined,
        contacts:
          contacts && contacts.length > 0
            ? {
                create: contacts.map((c) => ({
                  name: c.name,
                  designation: c.designation ?? undefined,
                  phone: c.phone ?? undefined,
                  email: c.email && c.email !== "" ? c.email : undefined,
                  isPrimary: c.isPrimary ?? false,
                })),
              }
            : undefined,
        bankAccounts:
          bankAccounts && bankAccounts.length > 0
            ? {
                create: bankAccounts.map((b) => ({
                  bankName: b.bankName,
                  accountNumber: b.accountNumber,
                  iban: b.iban ?? undefined,
                  branchName: b.branchName ?? undefined,
                  isDefault: b.isDefault ?? false,
                })),
              }
            : undefined,
      },
      include: {
        contacts: true,
        bankAccounts: true,
      },
    });

    await createAuditLog(
      userId,
      "CREATE",
      "Company",
      company.id,
      undefined,
      { name: company.name, type: company.type },
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("POST /api/companies:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to create company" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
