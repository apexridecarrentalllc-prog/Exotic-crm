import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/auth-helpers";
import { updateInvoiceSchema } from "@/lib/validations";
import { toNum } from "@/lib/utils";
import { startOfDay } from "date-fns";

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
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        payments: true,
        company: { include: { bankAccounts: true } },
        shipment: true,
        creditNotes: true,
        revisionHistory: { include: { changedBy: { select: { id: true, name: true } } }, orderBy: { changedAt: "desc" } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Not Found", message: "Invoice not found" },
        { status: 404 }
      );
    }

    const serialized = {
      ...invoice,
      subtotal: toNum(invoice.subtotal),
      taxRate: toNum(invoice.taxRate),
      taxAmount: toNum(invoice.taxAmount),
      withholdingTax: toNum(invoice.withholdingTax),
      totalAmount: toNum(invoice.totalAmount),
      paidAmount: toNum(invoice.paidAmount),
      balanceAmount: toNum(invoice.balanceAmount),
      exchangeRate: toNum(invoice.exchangeRate),
      lineItems: invoice.lineItems.map((li) => ({
        ...li,
        quantity: toNum(li.quantity),
        unitRate: toNum(li.unitRate),
        amount: toNum(li.amount),
        taxRate: toNum(li.taxRate),
      })),
      payments: invoice.payments.map((p) => ({
        ...p,
        amount: toNum(p.amount),
        exchangeRate: toNum(p.exchangeRate),
      })),
    };
    return NextResponse.json(serialized);
  } catch (error) {
    console.error("GET /api/invoices/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

/** Statuses in which an invoice can still be corrected. */
const EDITABLE_STATUSES = ["DRAFT", "SENT", "PARTIALLY_PAID", "OVERDUE"];

const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

async function patchHandler(
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
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        company: { select: { name: true } },
        shipment: { select: { referenceNumber: true } },
        _count: { select: { payments: true, creditNotes: true } },
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Not Found", message: "Invoice not found" },
        { status: 404 }
      );
    }

    if (!EDITABLE_STATUSES.includes(existing.status)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Paid or cancelled invoices cannot be edited" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateInvoiceSchema.safeParse(body);
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

    const data = parsed.data;
    const paid = toNum(existing.paidAmount);

    // Company / shipment: only while no money or credit has been booked against the invoice.
    const newCompanyId = data.companyId ?? existing.companyId;
    const newShipmentId = data.shipmentId ?? existing.shipmentId;
    const partiesChanged = newCompanyId !== existing.companyId || newShipmentId !== existing.shipmentId;
    let newCompanyName = existing.company.name;
    let newShipmentRef = existing.shipment.referenceNumber;
    if (partiesChanged) {
      if (existing._count.payments > 0 || existing._count.creditNotes > 0) {
        return NextResponse.json(
          { error: "Forbidden", message: "Company and shipment cannot be changed once payments or credit notes exist" },
          { status: 403 }
        );
      }
      const [company, shipment] = await Promise.all([
        prisma.company.findUnique({ where: { id: newCompanyId }, select: { name: true } }),
        prisma.shipment.findUnique({ where: { id: newShipmentId }, select: { referenceNumber: true } }),
      ]);
      if (!company || !shipment) {
        return NextResponse.json(
          { error: "Not Found", message: !company ? "Company not found" : "Shipment not found" },
          { status: 404 }
        );
      }
      newCompanyName = company.name;
      newShipmentRef = shipment.referenceNumber;
    }

    // Totals: recomputed only when line items are sent; never below what is already paid.
    let subtotal = toNum(existing.subtotal);
    let lineItemData: {
      description: string;
      quantity: number;
      unitRate: number;
      amount: number;
      taxRate: number;
      sortOrder: number;
    }[] | null = null;
    if (data.lineItems && data.lineItems.length > 0) {
      subtotal = 0;
      lineItemData = data.lineItems.map((line, i) => {
        const amount = line.quantity * line.unitRate;
        subtotal += amount;
        return {
          description: line.description,
          quantity: line.quantity,
          unitRate: line.unitRate,
          amount,
          taxRate: 0,
          sortOrder: i,
        };
      });
    }
    const totalAmount = subtotal;
    if (totalAmount < paid) {
      return NextResponse.json(
        { error: "Bad Request", message: `Total cannot be lower than the amount already paid (${paid})` },
        { status: 400 }
      );
    }
    const balanceAmount = totalAmount - paid;
    const dueDate = data.dueDate ?? existing.dueDate;

    // Keep the status consistent with the new balance and due date.
    let status = existing.status;
    if (existing.status !== "DRAFT") {
      if (balanceAmount <= 0) status = "PAID";
      else if (existing.status === "OVERDUE" && dueDate < startOfDay(new Date())) status = "OVERDUE";
      else status = paid > 0 ? "PARTIALLY_PAID" : "SENT";
    }

    const notes = data.notes !== undefined ? data.notes : existing.notes;

    // Revision trail for the fields that actually changed.
    const revisions: { fieldChanged: string; oldValue: string | null; newValue: string | null }[] = [];
    const track = (field: string, oldValue: string | null, newValue: string | null) => {
      if (oldValue !== newValue) revisions.push({ fieldChanged: field, oldValue, newValue });
    };
    track("company", existing.company.name, newCompanyName);
    track("shipment", existing.shipment.referenceNumber, newShipmentRef);
    track("dueDate", dateOnly(existing.dueDate), dateOnly(dueDate));
    track("notes", existing.notes ?? null, notes ?? null);
    if (lineItemData) {
      const summary = (items: { description: string; quantity: number; unitRate: number }[]) =>
        items.map((l) => `${l.description} x${toNum(l.quantity)} @ ${toNum(l.unitRate)}`).join("; ").slice(0, 900);
      track("lineItems", summary(existing.lineItems), summary(lineItemData));
    }
    track("totalAmount", String(toNum(existing.totalAmount)), String(totalAmount));
    track("status", existing.status, status);

    await prisma.$transaction(async (tx) => {
      if (lineItemData) {
        await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
      }
      await tx.invoice.update({
        where: { id },
        data: {
          companyId: newCompanyId,
          shipmentId: newShipmentId,
          dueDate,
          currency: "AED",
          taxRate: 0,
          taxAmount: 0,
          withholdingTax: 0,
          notes,
          subtotal,
          totalAmount,
          balanceAmount,
          status,
          ...(lineItemData ? { lineItems: { create: lineItemData } } : {}),
        },
      });
      if (revisions.length > 0) {
        await tx.invoiceRevision.createMany({
          data: revisions.map((r) => ({ ...r, invoiceId: id, changedById: userId })),
        });
      }
    });

    await createAuditLog(
      userId,
      "UPDATE",
      "Invoice",
      id,
      { invoiceNumber: existing.invoiceNumber, totalAmount: toNum(existing.totalAmount), status: existing.status },
      { totalAmount, status, changes: revisions.map((r) => r.fieldChanged) },
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    const updated = await prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: true,
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
    console.error("PATCH /api/invoices/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update invoice" },
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
      { error: "Bad Request", message: "Invoice ID is required" },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: {
        company: { select: { name: true } },
        shipment: { select: { referenceNumber: true } },
        _count: { select: { payments: true, creditNotes: true } },
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Not Found", message: "Invoice not found" },
        { status: 404 }
      );
    }
    // Money or credit already booked against the invoice must not silently disappear.
    if (existing._count.payments > 0) {
      return NextResponse.json(
        { error: "Forbidden", message: "This invoice has payments recorded and cannot be deleted. Cancel it instead if it was raised by mistake." },
        { status: 403 }
      );
    }
    if (existing._count.creditNotes > 0) {
      return NextResponse.json(
        { error: "Forbidden", message: "This invoice has credit notes and cannot be deleted" },
        { status: 403 }
      );
    }

    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Line items and revisions are removed with the invoice (cascade); drop its notifications too.
    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { relatedType: "Invoice", relatedId: id } }),
      prisma.invoice.delete({ where: { id } }),
    ]);

    await createAuditLog(
      userId,
      "DELETE",
      "Invoice",
      id,
      {
        invoiceNumber: existing.invoiceNumber,
        status: existing.status,
        company: existing.company.name,
        shipment: existing.shipment.referenceNumber,
        totalAmount: toNum(existing.totalAmount),
      },
      undefined,
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("DELETE /api/invoices/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
export const PATCH = withAuth(patchHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
// Same level as the "Delete invoices" permission in the role matrix.
export const DELETE = withAuth(deleteHandler, { roles: ["SUPER_ADMIN", "ADMIN"] });
