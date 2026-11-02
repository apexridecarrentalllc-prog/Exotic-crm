import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { getTransporter, getFrom, getBrandName } from "@/lib/email";

async function postHandler() {
  try {
    const session = await (await import("@/lib/auth")).auth();
    const email = session?.user?.email;
    const name = session?.user?.name;
    if (!email) {
      return NextResponse.json(
        { error: "Bad Request", message: "No user email" },
        { status: 400 }
      );
    }
    const transporter = await getTransporter();
    const from = getFrom();
    const brandName = await getBrandName();
    await transporter.sendMail({
      from,
      to: email,
      subject: `${brandName} – Test Email`,
      text: `Hello ${name ?? "User"},\n\nThis is a test email from ${brandName}. Email settings are working correctly.\n\n— ${brandName}`,
      html: `<p>Hello ${name ?? "User"},</p><p>This is a test email from ${brandName}. Email settings are working correctly.</p><p>— ${brandName}</p>`,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/settings/test-email:", error);
    const message = error instanceof Error ? error.message : "Test email failed";
    return NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler, { roles: ["SUPER_ADMIN", "ADMIN"] });
