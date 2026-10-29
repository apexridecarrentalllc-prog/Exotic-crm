import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toNum } from "@/lib/utils";
import { createAuditLog } from "@/lib/auth-helpers";
import { generateInvoicePdfBuffer } from "@/lib/pdf/generate-invoice-pdf";
import { sendInvoiceEmail, describeEmailError } from "@/lib/email";

/** Statuses from which the invoice email can still be sent again (without changing the status). */
const RESENDABLE_STATUSES = ["SENT", "PARTIALLY_PAID", "OVERDUE"];

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

    const isFirstSend = invoice.status === "DRAFT";
    if (!isFirstSend && !RESENDABLE_STATUSES.includes(invoice.status)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Only draft or open invoices can be sent" },
        { status: 403 }
      );
    }

    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sentAt = new Date();
    if (isFirstSend) {
      await prisma.invoice.update({
        where: { id },
        data: { status: "SENT", sentAt },
      });
    }

    // What really happened with the email. The screens show this instead of a blind "Invoice sent".
    let email: { attempted: boolean; sent: boolean; recipient?: string; error?: string; resend: boolean } = {
      attempted: false,
      sent: false,
      resend: !isFirstSend,
    };
    const primaryContact = invoice.company.contacts[0];
    if (!primaryContact?.email) {
      email.error = "This company has no primary contact email address, so no email could be sent.";
    } else {
      const recipientEmail = primaryContact.email.trim();
      try {
        const pdfBuffer = await generateInvoicePdfBuffer(id);
        const baseUrl =
          request.headers.get("x-forwarded-host")
            ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("x-forwarded-host")}`
            : process.env.NEXTAUTH_URL ?? "http://localhost:3000";
        const viewUrl = `${baseUrl}/invoices/${id}`;
        await sendInvoiceEmail({
          invoice: {
            invoiceNumber: invoice.invoiceNumber,
            dueDate: invoice.dueDate,
            totalAmount: toNum(invoice.totalAmount),
            currency: invoice.currency,
            shipment: invoice.shipment ? { referenceNumber: invoice.shipment.referenceNumber } : null,
          },
          pdfBuffer,
          recipientEmail,
          recipientName: primaryContact.name ?? invoice.company.name,
          viewUrl,
          log: { sentById: userId, invoiceId: id },
        });
        email = { attempted: true, sent: true, recipient: recipientEmail, resend: !isFirstSend };
      } catch (emailErr) {
        console.warn("Send invoice email failed:", emailErr);
        email = {
          attempted: true,
          sent: false,
          recipient: recipientEmail,
          error: describeEmailError(emailErr),
          resend: !isFirstSend,
        };
      }
    }

    if (isFirstSend) {
      const accountsUsers = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "ACCOUNTS_MANAGER", "SUPER_ADMIN"] } },
        select: { id: true },
      });
      await prisma.notification.createMany({
        data: accountsUsers.map((u) => ({
          userId: u.id,
          title: "Invoice sent",
          message: email.sent
            ? `Invoice ${invoice.invoiceNumber} was sent to ${invoice.company.name}.`
            : `Invoice ${invoice.invoiceNumber} was marked as sent to ${invoice.company.name}, but the email was not delivered.`,
          type: "GENERAL",
          relatedId: id,
          relatedType: "Invoice",
        })),
      });
    }

    await createAuditLog(
      userId,
      "UPDATE",
      "Invoice",
      id,
      { status: invoice.status },
      isFirstSend
        ? { status: "SENT", sentAt, emailDelivered: email.sent }
        : { emailResent: true, emailDelivered: email.sent },
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    const updated = await prisma.invoice.findUnique({
      where: { id },
      include: { company: true, shipment: true },
    });
    return NextResponse.json({ ...updated, email });
  } catch (error) {
    console.error("POST /api/invoices/[id]/send:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to send invoice" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
