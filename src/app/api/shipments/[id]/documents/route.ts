import { NextRequest, NextResponse } from "next/server";
import type { DocumentType } from "@prisma/client";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/upload";
import { getRequiredDocTypesForShipmentType } from "@/lib/document-constants";
import { createAuditLog } from "@/lib/auth-helpers";

async function getHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const shipmentId = context.params?.id;
  if (!shipmentId) {
    return NextResponse.json(
      { error: "Bad Request", message: "Shipment ID is required" },
      { status: 400 }
    );
  }

  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, referenceNumber: true, type: true },
    });
    if (!shipment) {
      return NextResponse.json(
        { error: "Not Found", message: "Shipment not found" },
        { status: 404 }
      );
    }

    const requiredTypes = getRequiredDocTypesForShipmentType(shipment.type);
    const documents = await prisma.document.findMany({
      where: { shipmentId },
      orderBy: [{ type: "asc" }, { version: "desc" }],
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });

    const byType = new Map<string, typeof documents>();
    for (const doc of documents) {
      if (!byType.has(doc.type)) byType.set(doc.type, []);
      byType.get(doc.type)!.push(doc);
    }

    const checklist = requiredTypes.map((type) => {
      const docs = byType.get(type) ?? [];
      const latest = docs.find((d) => d.isLatest) ?? docs[0];
      return {
        type,
        required: true,
        uploaded: !!latest,
        document: latest
          ? {
              id: latest.id,
              fileName: latest.fileName,
              originalName: latest.originalName,
              fileSize: latest.fileSize,
              version: latest.version,
              createdAt: latest.createdAt.toISOString(),
              uploaderName: latest.uploadedBy.name ?? latest.uploadedBy.email,
            }
          : null,
      };
    });

    const allDocs = documents.map((d) => ({
      id: d.id,
      type: d.type,
      fileName: d.fileName,
      originalName: d.originalName,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      filePath: d.filePath,
      version: d.version,
      isLatest: d.isLatest,
      notes: d.notes,
      createdAt: d.createdAt.toISOString(),
      uploadedBy: { id: d.uploadedBy.id, name: d.uploadedBy.name ?? d.uploadedBy.email },
    }));

    return NextResponse.json({
      shipmentId: shipment.id,
      shipmentRef: shipment.referenceNumber,
      shipmentType: shipment.type,
      checklist,
      documents: allDocs,
    });
  } catch (error) {
    console.error("GET /api/shipments/[id]/documents:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to list documents" },
      { status: 500 }
    );
  }
}

async function postHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const shipmentId = context.params?.id;
  if (!shipmentId) {
    return NextResponse.json(
      { error: "Bad Request", message: "Shipment ID is required" },
      { status: 400 }
    );
  }

  const session = await (await import("@/lib/auth")).auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: { id: true, referenceNumber: true, type: true, createdById: true },
    });
    if (!shipment) {
      return NextResponse.json(
        { error: "Not Found", message: "Shipment not found" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const typeParam = formData.get("type") as string | null;
    const notes = (formData.get("notes") as string)?.trim() || null;

    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Bad Request", message: "File is required" },
        { status: 400 }
      );
    }
    if (!typeParam) {
      return NextResponse.json(
        { error: "Bad Request", message: "Document type is required" },
        { status: 400 }
      );
    }

    const validTypes: DocumentType[] = [
      "BILL_OF_LADING", "PORT_CLEARANCE", "CUSTOMS_DECLARATION",
      "DELIVERY_RECEIPT", "INVOICE_COPY", "TRANSPORT_DOC", "INSURANCE", "OTHER",
    ];
    if (!validTypes.includes(typeParam as DocumentType)) {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid document type" },
        { status: 400 }
      );
    }
    const type = typeParam as DocumentType;

    const saved = await saveFile(file, shipmentId, type);

    const existingSameType = await prisma.document.findFirst({
      where: { shipmentId, type },
      orderBy: { version: "desc" },
    });

    let version = 1;
    let previousVersionId: string | null = null;

    if (existingSameType) {
      version = existingSameType.version + 1;
      previousVersionId = existingSameType.id;
      await prisma.document.update({
        where: { id: existingSameType.id },
        data: { isLatest: false },
      });
    }

    const doc = await prisma.document.create({
      data: {
        shipmentId,
        uploadedById: userId,
        type,
        fileName: saved.fileName,
        originalName: file.name,
        fileSize: saved.fileSize,
        mimeType: saved.mimeType,
        filePath: saved.filePath,
        version,
        isLatest: true,
        previousVersionId,
        notes,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });

    const requiredTypes = getRequiredDocTypesForShipmentType(shipment.type);
    const wasMissing = requiredTypes.includes(type);
    if (wasMissing && shipment.createdById) {
      await prisma.notification.create({
        data: {
          userId: shipment.createdById,
          title: "Document uploaded",
          message: `Document "${type}" was uploaded for shipment ${shipment.referenceNumber}.`,
          type: "MISSING_DOCUMENT",
          relatedId: doc.id,
          relatedType: "Document",
        },
      });
    }

    await createAuditLog(
      userId,
      "DOCUMENT_UPLOAD",
      "Document",
      doc.id,
      undefined,
      { shipmentId, type, fileName: doc.fileName, version }
    );

    return NextResponse.json({
      id: doc.id,
      type: doc.type,
      fileName: doc.fileName,
      originalName: doc.originalName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      filePath: doc.filePath,
      version: doc.version,
      isLatest: doc.isLatest,
      notes: doc.notes,
      createdAt: doc.createdAt.toISOString(),
      uploadedBy: { id: doc.uploadedBy.id, name: doc.uploadedBy.name ?? doc.uploadedBy.email },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("POST /api/shipments/[id]/documents:", error);
    return NextResponse.json(
      { error: "Bad Request", message },
      { status: 400 }
    );
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "OPERATIONS_STAFF"],
});
