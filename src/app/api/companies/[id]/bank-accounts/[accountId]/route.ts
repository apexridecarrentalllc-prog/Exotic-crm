import { NextRequest, NextResponse } from "next/server";
import { withAuth, createAuditLog } from "@/lib/auth-helpers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bankAccountSchema } from "@/lib/validations";

async function patchHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const companyId = context.params?.id;
  const accountId = context.params?.accountId;
  if (!companyId || !accountId) {
    return NextResponse.json(
      { error: "Bad Request", message: "Company ID and Account ID are required" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const parsed = bankAccountSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad Request", message: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.bankAccount.findFirst({
      where: { id: accountId, companyId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Not Found", message: "Bank account not found" },
        { status: 404 }
      );
    }

    const data: { bankName?: string; accountNumber?: string; iban?: string | null; branchName?: string | null; isDefault?: boolean } = {};
    if (parsed.data.bankName !== undefined) data.bankName = parsed.data.bankName;
    if (parsed.data.accountNumber !== undefined) data.accountNumber = parsed.data.accountNumber;
    if (parsed.data.iban !== undefined) data.iban = parsed.data.iban;
    if (parsed.data.branchName !== undefined) data.branchName = parsed.data.branchName;
    if (parsed.data.isDefault !== undefined) data.isDefault = parsed.data.isDefault;

    if (parsed.data.isDefault === true) {
      await prisma.bankAccount.updateMany({
        where: { companyId, id: { not: accountId } },
        data: { isDefault: false },
      });
    }

    const account = await prisma.bankAccount.update({
      where: { id: accountId },
      data,
    });
    const session = await auth();
    if (session?.user?.id) {
      await createAuditLog(
        session.user.id,
        "UPDATE",
        "BankAccount",
        accountId,
        existing as unknown as Record<string, unknown>,
        data
      );
    }
    return NextResponse.json(account);
  } catch (error) {
    console.error("PATCH /api/companies/[id]/bank-accounts/[accountId]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update bank account" },
      { status: 500 }
    );
  }
}

async function deleteHandler(
  _request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const companyId = context.params?.id;
  const accountId = context.params?.accountId;
  if (!companyId || !accountId) {
    return NextResponse.json(
      { error: "Bad Request", message: "Company ID and Account ID are required" },
      { status: 400 }
    );
  }

  try {
    const account = await prisma.bankAccount.findFirst({
      where: { id: accountId, companyId },
    });
    if (!account) {
      return NextResponse.json(
        { error: "Not Found", message: "Bank account not found" },
        { status: 404 }
      );
    }

    await prisma.bankAccount.delete({
      where: { id: accountId },
    });
    const session = await auth();
    if (session?.user?.id) {
      await createAuditLog(
        session.user.id,
        "DELETE",
        "BankAccount",
        accountId,
        { companyId, bankName: account.bankName, accountNumber: account.accountNumber },
        undefined
      );
    }
    return NextResponse.json({ success: true, id: accountId });
  } catch (error) {
    console.error("DELETE /api/companies/[id]/bank-accounts/[accountId]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to delete bank account" },
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
