import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/auth-helpers";
import { createCreditNoteSchema } from "@/lib/validations";
import { generateCreditNoteNumber } from "@/lib/invoice-number";
import { toNum } from "@/lib/utils";

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
    const parsed = createCreditNoteSchema.safeParse(body);
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
        { error: "Bad Request", message: "Credit note amount cannot exceed invoice balance" },
        { status: 400 }
      );
    }

    const creditNoteNumber = await generateCreditNoteNumber();
    const creditNote = await prisma.creditNote.create({
      data: {
        invoiceId: id,
        companyId: invoice.companyId,
        shipmentId: invoice.shipmentId,
        creditNoteNumber,
        amount: parsed.data.amount,
        reason: parsed.data.reason,
        status: "ISSUED",
        issuedAt: new Date(),
      },
      include: { company: true, invoice: true },
    });

    await createAuditLog(
      userId,
      "CREATE",
      "CreditNote",
      creditNote.id,
      undefined,
      { creditNoteNumber, invoiceId: id, amount: parsed.data.amount },
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    return NextResponse.json(creditNote, { status: 201 });
  } catch (error) {
    console.error("POST /api/invoices/[id]/credit-notes:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to create credit note" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
