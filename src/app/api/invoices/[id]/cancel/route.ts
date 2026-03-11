import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/auth-helpers";
import { cancelInvoiceSchema } from "@/lib/validations";

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
    const body = await request.json().catch(() => ({}));
    const parsed = cancelInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad Request", message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Not Found", message: "Invoice not found" },
        { status: 404 }
      );
    }

    if (existing.status === "PAID") {
      return NextResponse.json(
        { error: "Forbidden", message: "Cannot cancel a fully paid invoice" },
        { status: 403 }
      );
    }

    if (existing.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Forbidden", message: "Invoice is already cancelled" },
        { status: 403 }
      );
    }

    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cancelledAt = new Date();
    await prisma.invoice.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt,
        cancelReason: parsed.data.reason,
      },
    });

    await createAuditLog(
      userId,
      "UPDATE",
      "Invoice",
      id,
      { status: existing.status },
      { status: "CANCELLED", cancelReason: parsed.data.reason, cancelledAt },
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    const updated = await prisma.invoice.findUnique({
      where: { id },
      include: { company: true, shipment: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/invoices/[id]/cancel:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to cancel invoice" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
