import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { getSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings";

async function getHandler() {
  try {
    const logoUrl = await getSetting(SETTING_KEYS.COMPANY_LOGO);
    return NextResponse.json({
      companyLogo: logoUrl ?? null,
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
