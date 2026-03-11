import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/auth-helpers";
import { updateInvoiceSchema } from "@/lib/validations";
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
    const existing = await prisma.invoice.findUnique({ where: { id }, include: { lineItems: true } });
    if (!existing) {
      return NextResponse.json(
        { error: "Not Found", message: "Invoice not found" },
        { status: 404 }
      );
    }

    if (existing.status === "PAID" || existing.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Forbidden", message: "Cannot edit a paid or cancelled invoice" },
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

    if (existing.status === "SENT" || existing.status === "PARTIALLY_PAID" || existing.status === "OVERDUE") {
      if (data.lineItems !== undefined) {
        return NextResponse.json(
          { error: "Forbidden", message: "Cannot change line items after invoice is sent" },
          { status: 403 }
        );
      }
    }

    let updatePayload: Record<string, unknown> = {
      dueDate: data.dueDate ?? existing.dueDate,
      currency: data.currency ?? existing.currency,
      taxRate: data.taxRate ?? toNum(existing.taxRate),
      withholdingTax: data.withholdingTax ?? toNum(existing.withholdingTax),
      notes: data.notes !== undefined ? data.notes : existing.notes,
    };

    if (existing.status === "DRAFT" && data.lineItems && data.lineItems.length > 0) {
      let subtotal = 0;
      const lineItemData = data.lineItems.map((line, i) => {
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
      const taxAmount = subtotal * ((data.taxRate ?? toNum(existing.taxRate)) / 100);
      const totalAmount = subtotal + taxAmount - (data.withholdingTax ?? toNum(existing.withholdingTax));
      const balanceAmount = totalAmount - toNum(existing.paidAmount);

      await prisma.$transaction([
        prisma.invoiceLineItem.deleteMany({ where: { invoiceId: id } }),
        prisma.invoice.update({
          where: { id },
          data: {
            ...updatePayload,
            subtotal,
            taxAmount,
            totalAmount,
            balanceAmount,
            taxRate: data.taxRate ?? existing.taxRate,
            withholdingTax: data.withholdingTax ?? existing.withholdingTax,
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
        }),
      ]);
    } else {
      if (existing.status === "DRAFT" && (data.taxRate !== undefined || data.withholdingTax !== undefined)) {
        const currentSubtotal = existing.lineItems.reduce((s, li) => s + toNum(li.amount), 0);
        const taxRate = data.taxRate ?? toNum(existing.taxRate);
        const withholdingTax = data.withholdingTax ?? toNum(existing.withholdingTax);
        const taxAmount = currentSubtotal * (taxRate / 100);
        const totalAmount = currentSubtotal + taxAmount - withholdingTax;
        const balanceAmount = totalAmount - toNum(existing.paidAmount);
        updatePayload = {
          ...updatePayload,
          subtotal: currentSubtotal,
          taxRate,
          taxAmount,
          withholdingTax,
          totalAmount,
          balanceAmount,
        };
      }
      await prisma.invoice.update({
        where: { id },
        data: updatePayload as Prisma.InvoiceUpdateInput,
      });
    }

    await createAuditLog(
      userId,
      "UPDATE",
      "Invoice",
      id,
      { invoiceNumber: existing.invoiceNumber },
      { ...data },
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
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Not Found", message: "Invoice not found" },
        { status: 404 }
      );
    }
    if (existing.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Forbidden", message: "Only draft invoices can be deleted" },
        { status: 403 }
      );
    }

    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.invoice.delete({ where: { id } });
    await createAuditLog(
      userId,
      "DELETE",
      "Invoice",
      id,
      { invoiceNumber: existing.invoiceNumber },
      undefined
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
export const DELETE = withAuth(deleteHandler, { roles: ["SUPER_ADMIN"] });
