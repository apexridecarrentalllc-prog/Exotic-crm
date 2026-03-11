import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { checkOverdueInvoices } from "@/lib/alert-checker";

async function postHandler() {
  try {
    const count = await checkOverdueInvoices();
    return NextResponse.json({ ok: true, updated: count });
  } catch (error) {
    console.error("POST /api/settings/run-overdue-check:", error);
    const message = error instanceof Error ? error.message : "Overdue check failed";
    return NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler, { roles: ["SUPER_ADMIN"] });
