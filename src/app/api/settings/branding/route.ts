import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings";

async function getHandler() {
  try {
    const logoUrl = await getSetting(SETTING_KEYS.COMPANY_LOGO);
    const storedName = (await getSetting(SETTING_KEYS.COMPANY_NAME))?.trim();
    return NextResponse.json({
      companyLogo: logoUrl ?? null,
      companyName: storedName || process.env.NEXT_PUBLIC_COMPANY_NAME || "PISTIS",
    });
  } catch (error) {
    console.error("GET /api/settings/branding:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to load branding" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
