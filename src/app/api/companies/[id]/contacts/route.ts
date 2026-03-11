import { NextRequest, NextResponse } from "next/server";
import { withAuth, createAuditLog } from "@/lib/auth-helpers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations";

async function getHandler(
  _request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const companyId = context.params?.id;
  if (!companyId) {
    return NextResponse.json(
      { error: "Bad Request", message: "Company ID is required" },
      { status: 400 }
    );
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json(
        { error: "Not Found", message: "Company not found" },
        { status: 404 }
      );
    }

    const contacts = await prisma.companyContact.findMany({
      where: { companyId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(contacts);
  } catch (error) {
    console.error("GET /api/companies/[id]/contacts:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to list contacts" },
      { status: 500 }
    );
  }
}

async function postHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const companyId = context.params?.id;
  if (!companyId) {
    return NextResponse.json(
      { error: "Bad Request", message: "Company ID is required" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad Request", message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json(
        { error: "Not Found", message: "Company not found" },
        { status: 404 }
      );
    }

    const contact = await prisma.companyContact.create({
      data: {
        companyId,
        name: parsed.data.name,
        designation: parsed.data.designation ?? undefined,
        phone: parsed.data.phone ?? undefined,
        email: parsed.data.email && parsed.data.email !== "" ? parsed.data.email : undefined,
        isPrimary: parsed.data.isPrimary ?? false,
      },
    });
    const session = await auth();
    if (session?.user?.id) {
      await createAuditLog(
        session.user.id,
        "CREATE",
        "CompanyContact",
        contact.id,
        undefined,
        { companyId, name: contact.name }
      );
    }
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("POST /api/companies/[id]/contacts:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to create contact" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
