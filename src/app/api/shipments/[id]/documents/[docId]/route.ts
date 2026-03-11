import { NextRequest, NextResponse } from "next/server";
import type { DocumentType } from "@prisma/client";
import { createReadStream, existsSync } from "fs";
import path from "path";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/auth-helpers";

async function getHandler(
  _request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const shipmentId = context.params?.id;
  const docId = context.params?.docId;
  if (!shipmentId || !docId) {
    return NextResponse.json(
      { error: "Bad Request", message: "Shipment ID and Document ID are required" },
      { status: 400 }
    );
  }

  try {
    const doc = await prisma.document.findFirst({
      where: { id: docId, shipmentId },
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
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.originalName)}"`);
    if (doc.fileSize) headers.set("Content-Length", String(doc.fileSize));

    return new NextResponse(stream as unknown as BodyInit, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("GET /api/shipments/[id]/documents/[docId]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to stream file" },
      { status: 500 }
    );
  }
}

async function patchHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const shipmentId = context.params?.id;
  const docId = context.params?.docId;
  if (!shipmentId || !docId) {
    return NextResponse.json(
      { error: "Bad Request", message: "Shipment ID and Document ID are required" },
      { status: 400 }
    );
  }

  const session = await (await import("@/lib/auth")).auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const doc = await prisma.document.findFirst({
      where: { id: docId, shipmentId },
    });
    if (!doc) {
      return NextResponse.json(
        { error: "Not Found", message: "Document not found" },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : undefined;
    const type = body.type;

    const validTypes = [
      "BILL_OF_LADING", "PORT_CLEARANCE", "CUSTOMS_DECLARATION",
      "DELIVERY_RECEIPT", "INVOICE_COPY", "TRANSPORT_DOC", "INSURANCE", "OTHER",
    ];
    const data: { notes?: string | null; type?: DocumentType } = {};
    if (notes !== undefined) data.notes = notes;
    if (type && validTypes.includes(type)) data.type = type as DocumentType;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(doc, { status: 200 });
    }

    const updated = await prisma.document.update({
      where: { id: docId },
      data,
    });

    await createAuditLog(userId, "DOCUMENT_UPDATE", "Document", docId, { notes: doc.notes, type: doc.type }, data);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/shipments/[id]/documents/[docId]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update document" },
      { status: 500 }
    );
  }
}

async function deleteHandler(
  _request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const shipmentId = context.params?.id;
  const docId = context.params?.docId;
  if (!shipmentId || !docId) {
    return NextResponse.json(
      { error: "Bad Request", message: "Shipment ID and Document ID are required" },
      { status: 400 }
    );
  }

  const session = await (await import("@/lib/auth")).auth();
  const userId = session?.user?.id;
  const userRole = session?.user?.role;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const doc = await prisma.document.findFirst({
      where: { id: docId, shipmentId },
    });
    if (!doc) {
      return NextResponse.json(
        { error: "Not Found", message: "Document not found" },
        { status: 404 }
      );
    }

    const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
    const isUploader = doc.uploadedById === userId;
    if (!isAdmin && !isUploader) {
      return NextResponse.json(
        { error: "Forbidden", message: "Only uploader or admin can delete this document" },
        { status: 403 }
      );
    }

    await prisma.document.delete({ where: { id: docId } });
    await createAuditLog(userId, "DOCUMENT_DELETE", "Document", docId, { fileName: doc.fileName }, undefined);

    return NextResponse.json({ id: docId, deleted: true });
  } catch (error) {
    console.error("DELETE /api/shipments/[id]/documents/[docId]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to delete document" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
export const PATCH = withAuth(patchHandler);
export const DELETE = withAuth(deleteHandler);
