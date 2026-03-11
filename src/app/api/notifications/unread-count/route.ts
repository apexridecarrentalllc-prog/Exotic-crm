import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

async function getHandler() {
  const session = await (await import("@/lib/auth")).auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ count: 0 });
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  return NextResponse.json({ count });
}

export const GET = withAuth(getHandler);
