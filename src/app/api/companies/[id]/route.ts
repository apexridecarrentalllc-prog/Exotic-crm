import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/auth-helpers";
import { companyUpdateSchema } from "@/lib/validations";
import { toNum } from "@/lib/utils";

async function getHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json(
      { error: "Bad Request", message: "Company ID is required" },
      { status: 400 }
    );
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        contacts: true,
        bankAccounts: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Not Found", message: "Company not found" },
        { status: 404 }
      );
    }

    const [invoiceAgg, paymentAgg, recentInvoices, shipmentIds] = await Promise.all([
      prisma.invoice.aggregate({
        where: { companyId: id, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true, balanceAmount: true, paidAmount: true },
      }),
      prisma.payment.aggregate({
        where: { companyId: id },
        _sum: { amount: true },
      }),
      prisma.invoice.findMany({
        where: { companyId: id },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { shipment: { select: { id: true, referenceNumber: true, status: true } } },
      }),
      prisma.invoice.findMany({
        where: { companyId: id },
        select: { shipmentId: true },
        distinct: ["shipmentId"],
      }),
    ]);

    const totalInvoiced = toNum(invoiceAgg._sum.totalAmount);
    const totalPaid = toNum(paymentAgg._sum.amount);
    const outstanding = toNum(invoiceAgg._sum.balanceAmount);

    const recentShipmentIds = shipmentIds.map((i) => i.shipmentId).filter(Boolean);
    const recentShipments =
      recentShipmentIds.length > 0
        ? await prisma.shipment.findMany({
            where: { id: { in: recentShipmentIds as string[] } },
            take: 5,
            orderBy: { createdAt: "desc" },
          })
        : [];

    return NextResponse.json({
      ...company,
      financialSummary: {
        totalInvoiced,
        totalPaid,
        outstanding,
      },
      recentInvoices: recentInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        totalAmount: toNum(inv.totalAmount),
        balanceAmount: toNum(inv.balanceAmount),
        dueDate: inv.dueDate,
        shipment: inv.shipment,
      })),
      recentShipments,
    });
  } catch (error) {
    console.error("GET /api/companies/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch company" },
      { status: 500 }
    );
  }
}

async function patchHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json(
      { error: "Bad Request", message: "Company ID is required" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const parsed = companyUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad Request", message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Not Found", message: "Company not found" },
        { status: 404 }
      );
    }

    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contacts, bankAccounts, ...companyData } = parsed.data;

    if (contacts !== undefined) {
      for (const c of contacts) {
        if (c.id) {
          await prisma.companyContact.update({
            where: { id: c.id, companyId: id },
            data: {
              name: c.name,
              designation: c.designation ?? undefined,
              phone: c.phone ?? undefined,
              email: c.email && c.email !== "" ? c.email : undefined,
              isPrimary: c.isPrimary ?? false,
            },
          });
        } else {
          await prisma.companyContact.create({
            data: {
              companyId: id,
              name: c.name,
              designation: c.designation ?? undefined,
              phone: c.phone ?? undefined,
              email: c.email && c.email !== "" ? c.email : undefined,
              isPrimary: c.isPrimary ?? false,
            },
          });
        }
      }
    }

    if (bankAccounts !== undefined) {
      for (const b of bankAccounts) {
        if (b.id) {
          await prisma.bankAccount.update({
            where: { id: b.id, companyId: id },
            data: {
              bankName: b.bankName,
              accountNumber: b.accountNumber,
              iban: b.iban ?? undefined,
              branchName: b.branchName ?? undefined,
              isDefault: b.isDefault ?? false,
            },
          });
        } else {
          await prisma.bankAccount.create({
            data: {
              companyId: id,
              bankName: b.bankName,
              accountNumber: b.accountNumber,
              iban: b.iban ?? undefined,
              branchName: b.branchName ?? undefined,
              isDefault: b.isDefault ?? false,
            },
          });
        }
      }
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        ...(companyData.name !== undefined && { name: companyData.name }),
        ...(companyData.type !== undefined && { type: companyData.type }),
        ...(companyData.address !== undefined && { address: companyData.address }),
        ...(companyData.city !== undefined && { city: companyData.city }),
        ...(companyData.country !== undefined && { country: companyData.country }),
        ...(companyData.notes !== undefined && { notes: companyData.notes }),
        ...(companyData.isActive !== undefined && { isActive: companyData.isActive }),
        ...(companyData.paymentTerms !== undefined && { paymentTerms: companyData.paymentTerms }),
        ...(companyData.currency !== undefined && { currency: companyData.currency }),
        ...(companyData.taxNumber !== undefined && { taxNumber: companyData.taxNumber }),
      },
      include: { contacts: true, bankAccounts: true },
    });

    await createAuditLog(
      userId,
      "UPDATE",
      "Company",
      id,
      { name: existing.name },
      { name: company.name },
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    return NextResponse.json(company);
  } catch (error) {
    console.error("PATCH /api/companies/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update company" },
      { status: 500 }
    );
  }
}

async function deleteHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json(
      { error: "Bad Request", message: "Company ID is required" },
      { status: 400 }
    );
  }

  try {
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return NextResponse.json(
        { error: "Not Found", message: "Company not found" },
        { status: 404 }
      );
    }

    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoicesWithShipments = await prisma.invoice.findMany({
      where: { companyId: id },
      select: { shipmentId: true, shipment: { select: { status: true } } },
    });
    const activeShipmentIds = invoicesWithShipments.filter(
      (i) => i.shipment && i.shipment.status !== "CLOSED" && i.shipment.status !== "DELIVERED"
    );
    if (activeShipmentIds.length > 0) {
      return NextResponse.json(
        {
          error: "Conflict",
          message:
            "Cannot deactivate company with active (non-CLOSED) shipments. Close or complete related shipments first.",
        },
        { status: 409 }
      );
    }

    await prisma.company.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog(
      userId,
      "SOFT_DELETE",
      "Company",
      id,
      { isActive: company.isActive },
      { isActive: false },
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("DELETE /api/companies/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to deactivate company" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
export const PATCH = withAuth(patchHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
export const DELETE = withAuth(deleteHandler, {
  roles: ["SUPER_ADMIN", "ADMIN"],
});
