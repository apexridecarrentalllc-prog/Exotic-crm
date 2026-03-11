import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { setSettings } from "@/lib/settings";

const USER_PREF_PREFIX = "user_pref:";

async function patchHandler(request: NextRequest) {
  try {
    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Bad Request", message: "Body must be an object" }, { status: 400 });
    }
    const prefix = `${USER_PREF_PREFIX}${userId}:`;
    const entries: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof key !== "string" || !key.startsWith(prefix)) continue;
      entries[key] = value === null || value === undefined ? "" : String(value);
    }
    if (Object.keys(entries).length === 0) {
      return NextResponse.json({ ok: true });
    }
    await setSettings(entries, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/settings/me:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update preferences" },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(patchHandler);
