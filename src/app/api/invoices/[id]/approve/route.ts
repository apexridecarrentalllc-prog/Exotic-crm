import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/auth-helpers";

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
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Not Found", message: "Invoice not found" },
        { status: 404 }
      );
    }

    if (invoice.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Forbidden", message: "Only draft invoices can be approved" },
        { status: 403 }
      );
    }

    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const approvedAt = new Date();
    const sentAt = new Date();
    await prisma.invoice.update({
      where: { id },
      data: {
        status: "SENT",
        approvedById: userId,
        approvedAt,
        sentAt,
      },
    });

    const primaryContact = invoice.company.contacts[0];
    if (primaryContact?.email) {
      try {
        const { default: nodemailer } = await import("nodemailer");
        const baseUrl = request.headers.get("x-forwarded-host")
          ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("x-forwarded-host")}`
          : process.env.NEXTAUTH_URL ?? "http://localhost:3000";
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT ?? 587),
          secure: process.env.SMTP_SECURE === "true",
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM ?? "noreply@iemanager.com",
          to: primaryContact.email,
          subject: "Invoice " + invoice.invoiceNumber + " approved and sent",
          text: "Invoice " + invoice.invoiceNumber + " has been approved. Due date: " + invoice.dueDate.toISOString().slice(0, 10) + ". PDF: " + baseUrl + "/api/invoices/" + id + "/pdf",
        });
      } catch (emailErr) {
        console.warn("Approve invoice email failed:", emailErr);
      }
    }

    await createAuditLog(
      userId,
      "UPDATE",
      "Invoice",
      id,
      { status: "DRAFT" },
      { status: "SENT", approvedById: userId, approvedAt, sentAt },
      request.headers.get("x-forwarded-for") ?? undefined,
      request.headers.get("user-agent") ?? undefined
    );

    const updated = await prisma.invoice.findUnique({
      where: { id },
      include: { company: true, shipment: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/invoices/[id]/approve:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to approve invoice" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler, {
  roles: ["SUPER_ADMIN", "ADMIN"],
});
