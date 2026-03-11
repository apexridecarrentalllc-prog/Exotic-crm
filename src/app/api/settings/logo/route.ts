import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { saveLogoFile } from "@/lib/upload";
import { setSettings } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/settings";

async function postHandler(request: NextRequest) {
  try {
    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Bad Request", message: "Missing or invalid file. Use form field 'file'." },
        { status: 400 }
      );
    }

    const publicPath = await saveLogoFile(file);
    await setSettings({ [SETTING_KEYS.COMPANY_LOGO]: publicPath }, userId);

    return NextResponse.json({ ok: true, url: publicPath });
  } catch (error) {
    console.error("POST /api/settings/logo:", error);
    const message = error instanceof Error ? error.message : "Logo upload failed";
    return NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler, { roles: ["SUPER_ADMIN", "ADMIN"] });
