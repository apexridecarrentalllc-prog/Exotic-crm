import { NextRequest, NextResponse } from "next/server";
import { withAuth, createAuditLog } from "@/lib/auth-helpers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bankAccountSchema } from "@/lib/validations";

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

    const accounts = await prisma.bankAccount.findMany({
      where: { companyId },
    });
    return NextResponse.json(accounts);
  } catch (error) {
    console.error("GET /api/companies/[id]/bank-accounts:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to list bank accounts" },
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
    const parsed = bankAccountSchema.safeParse(body);
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

    const account = await prisma.bankAccount.create({
      data: {
        companyId,
        bankName: parsed.data.bankName,
        accountNumber: parsed.data.accountNumber,
        iban: parsed.data.iban ?? undefined,
        branchName: parsed.data.branchName ?? undefined,
        isDefault: parsed.data.isDefault ?? false,
      },
    });
    const session = await auth();
    if (session?.user?.id) {
      await createAuditLog(
        session.user.id,
        "CREATE",
        "BankAccount",
        account.id,
        undefined,
        { companyId, bankName: account.bankName, accountNumber: account.accountNumber }
      );
    }
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("POST /api/companies/[id]/bank-accounts:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to create bank account" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"],
});
