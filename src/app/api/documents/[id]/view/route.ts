import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync } from "fs";
import path from "path";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/**
 * Serves the document file with Content-Disposition: inline for in-browser viewing.
 */
async function getHandler(
  _request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json(
      { error: "Bad Request", message: "Document ID is required" },
      { status: 400 }
    );
  }

  try {
    const doc = await prisma.document.findUnique({
      where: { id },
    });
    if (!doc) {
      return NextResponse.json(
        { error: "Not Found", message: "Document not found" },
        { status: 404 }
      );
    }

    const fullPath = path.join(process.cwd(), "public", doc.filePath);
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { error: "Not Found", message: "File not found on disk" },
        { status: 404 }
      );
    }

    const stream = createReadStream(fullPath);
    const headers = new Headers();
    headers.set("Content-Type", doc.mimeType);
    headers.set("Content-Disposition", `inline; filename="${encodeURIComponent(doc.originalName)}"`);
    if (doc.fileSize) headers.set("Content-Length", String(doc.fileSize));

    return new NextResponse(stream as unknown as BodyInit, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("GET /api/documents/[id]/view:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to serve file" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
