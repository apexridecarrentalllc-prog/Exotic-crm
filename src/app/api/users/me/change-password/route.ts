import { NextRequest, NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth-helpers";
import { createAuditLog } from "@/lib/auth-helpers";
import { changePasswordSchema } from "@/lib/validations";

async function postHandler(request: NextRequest) {
  const session = await (await import("@/lib/auth")).auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad Request", message: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Not Found", message: "User not found" }, { status: 404 });
  }

  const valid = await compare(parsed.data.currentPassword, user.password);
  if (!valid) {
    return NextResponse.json(
      { error: "Bad Request", message: "Current password is incorrect" },
      { status: 400 }
    );
  }

  const hashedPassword = await hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  await createAuditLog(
    userId,
    "CHANGE_PASSWORD",
    "User",
    userId,
    undefined,
    {},
    request.headers.get("x-forwarded-for") ?? undefined,
    request.headers.get("user-agent") ?? undefined
  );

  return NextResponse.json({ success: true, message: "Password changed successfully" });
}

export const POST = withAuth(postHandler);
