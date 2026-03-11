import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

async function postHandler() {
  try {
    const result = await prisma.notification.deleteMany({});
    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (error) {
    console.error("POST /api/settings/clear-notifications:", error);
    const message = error instanceof Error ? error.message : "Clear failed";
    return NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler, { roles: ["SUPER_ADMIN"] });
