import { NextRequest, NextResponse } from "next/server";
import { withAuth, createAuditLog } from "@/lib/auth-helpers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations";

async function patchHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const companyId = context.params?.id;
  const contactId = context.params?.contactId;
  if (!companyId || !contactId) {
    return NextResponse.json(
      { error: "Bad Request", message: "Company ID and Contact ID are required" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const parsed = contactSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad Request", message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.companyContact.findFirst({
      where: { id: contactId, companyId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Not Found", message: "Contact not found" },
        { status: 404 }
      );
    }

    const data: { name?: string; designation?: string | null; phone?: string | null; email?: string | null; isPrimary?: boolean } = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.designation !== undefined) data.designation = parsed.data.designation;
    if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;
    if (parsed.data.email !== undefined)
      data.email = parsed.data.email && parsed.data.email !== "" ? parsed.data.email : null;
    if (parsed.data.isPrimary !== undefined) data.isPrimary = parsed.data.isPrimary;

    const contact = await prisma.companyContact.update({
      where: { id: contactId },
      data,
    });
    const session = await auth();
    if (session?.user?.id) {
      await createAuditLog(
        session.user.id,
        "UPDATE",
        "CompanyContact",
        contactId,
        existing as unknown as Record<string, unknown>,
        data
      );
    }
    return NextResponse.json(contact);
  } catch (error) {
    console.error("PATCH /api/companies/[id]/contacts/[contactId]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update contact" },
      { status: 500 }
    );
  }
}

async function deleteHandler(
  _request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const companyId = context.params?.id;
  const contactId = context.params?.contactId;
  if (!companyId || !contactId) {
    return NextResponse.json(
      { error: "Bad Request", message: "Company ID and Contact ID are required" },
      { status: 400 }
    );
  }

  try {
    const contact = await prisma.companyContact.findFirst({
      where: { id: contactId, companyId },
    });
    if (!contact) {
      return NextResponse.json(
        { error: "Not Found", message: "Contact not found" },
        { status: 404 }
      );
    }

    const count = await prisma.companyContact.count({ where: { companyId } });
    if (count <= 1) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "Cannot delete the only contact. Company must have at least one contact.",
        },
        { status: 409 }
      );
    }

    await prisma.companyContact.delete({
      where: { id: contactId },
    });
    const session = await auth();
    if (session?.user?.id) {
      await createAuditLog(
        session.user.id,
        "DELETE",
        "CompanyContact",
        contactId,
        { companyId, name: contact.name },
        undefined
      );
    }
    return NextResponse.json({ success: true, id: contactId });
  } catch (error) {
    console.error("DELETE /api/companies/[id]/contacts/[contactId]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to delete contact" },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(patchHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
export const DELETE = withAuth(deleteHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
