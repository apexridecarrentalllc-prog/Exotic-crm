import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth-helpers";
import { sendPasswordResetEmail } from "@/lib/email";

function generateTemporaryPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function postHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json(
      { error: "Bad Request", message: "User ID is required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "Not Found", message: "User not found" },
      { status: 404 }
    );
  }

  const temporaryPassword = generateTemporaryPassword();
  const hashedPassword = await hash(temporaryPassword, 10);

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });

  try {
    const baseUrl =
      request.headers.get("x-forwarded-host")
        ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("x-forwarded-host")}`
        : process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      temporaryPassword,
      loginUrl: `${baseUrl}/login`,
    });
  } catch (emailErr) {
    console.warn("Reset password email failed:", emailErr);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Password was reset but email could not be sent" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Password reset successfully. User has been emailed the new temporary password.",
  });
}

export const POST = withAuth(postHandler, { roles: ["SUPER_ADMIN"] });
