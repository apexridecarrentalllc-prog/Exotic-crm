import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { getAllSettings, setSettings } from "@/lib/settings";

async function getHandler() {
  try {
    const all = await getAllSettings();
    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    const out: Record<string, string> = {};
    const userPrefPrefix = userId ? `user_pref:${userId}:` : "";
    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith("user_pref:")) {
        if (userPrefPrefix && key.startsWith(userPrefPrefix)) out[key] = value;
      } else {
        out[key] = value;
      }
    }
    return NextResponse.json(out);
  } catch (error) {
    console.error("GET /api/settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to load settings" },
      { status: 500 }
    );
  }
}

async function patchHandler(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Bad Request", message: "Body must be an object of key-value pairs" },
        { status: 400 }
      );
    }
    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    const entries: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof key !== "string") continue;
      entries[key] = value === null || value === undefined ? "" : String(value);
    }
    if (Object.keys(entries).length === 0) {
      return NextResponse.json({ ok: true });
    }
    await setSettings(entries, userId ?? undefined);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update settings" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler, { roles: ["SUPER_ADMIN", "ADMIN"] });
export const PATCH = withAuth(patchHandler, { roles: ["SUPER_ADMIN"] });
