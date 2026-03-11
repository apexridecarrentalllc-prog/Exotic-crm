import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { sendPaymentReminderEmail } from "@/lib/email";
import { differenceInDays } from "date-fns";

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

  const session = await (await import("@/lib/auth")).auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      company: { include: { contacts: { where: { isPrimary: true }, take: 1 } } },
      shipment: true,
    },
  });

  if (!invoice) {
    return NextResponse.json(
      { error: "Not Found", message: "Invoice not found" },
      { status: 404 }
    );
  }

  if (invoice.status !== "SENT" && invoice.status !== "PARTIALLY_PAID" && invoice.status !== "OVERDUE") {
    return NextResponse.json(
      { error: "Bad Request", message: "Reminder can only be sent for sent or overdue invoices" },
      { status: 400 }
    );
  }

  const primaryContact = invoice.company.contacts[0];
  const recipientEmail = primaryContact?.email?.trim();
  if (!recipientEmail) {
    return NextResponse.json(
      { error: "Bad Request", message: "No primary contact email for this company" },
      { status: 400 }
    );
  }

  const daysOverdue = Math.max(0, differenceInDays(new Date(), invoice.dueDate));
  const baseUrl =
    request.headers.get("x-forwarded-host")
      ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("x-forwarded-host")}`
      : process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const viewUrl = `${baseUrl}/invoices/${id}`;

  try {
    await sendPaymentReminderEmail({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        dueDate: invoice.dueDate,
        totalAmount: toNum(invoice.balanceAmount),
        currency: invoice.currency,
        shipment: invoice.shipment ? { referenceNumber: invoice.shipment.referenceNumber } : null,
      },
      company: { name: invoice.company.name },
      daysOverdue,
      recipientEmail,
      viewUrl,
      log: { sentById: userId, invoiceId: id },
    });
  } catch (err) {
    console.error("Send reminder email failed:", err);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to send reminder email" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Payment reminder sent successfully",
  });
}

export const POST = withAuth(postHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
