import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { saveLogoFile, deleteLogoFile } from "@/lib/upload";
import { getSetting, setSettings } from "@/lib/settings";
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

/** Removes the uploaded logo. Invoice PDFs then fall back to the default logo file. Safe to call twice. */
async function deleteHandler() {
  try {
    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;

    const current = await getSetting(SETTING_KEYS.COMPANY_LOGO);
    await setSettings({ [SETTING_KEYS.COMPANY_LOGO]: "" }, userId);
    if (current) await deleteLogoFile(current);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/settings/logo:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to remove logo" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler, { roles: ["SUPER_ADMIN", "ADMIN"] });
export const DELETE = withAuth(deleteHandler, { roles: ["SUPER_ADMIN", "ADMIN"] });
