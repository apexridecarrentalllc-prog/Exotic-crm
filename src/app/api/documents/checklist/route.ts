import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRequiredDocTypesForShipmentType } from "@/lib/document-constants";

async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const missingOnly = searchParams.get("missingOnly") === "true";

    const shipments = await prisma.shipment.findMany({
      where: { status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, referenceNumber: true, type: true },
    });

    const docLists = await prisma.document.findMany({
      where: { shipmentId: { in: shipments.map((s) => s.id) } },
      orderBy: [{ type: "asc" }, { version: "desc" }],
      include: {
        uploadedBy: { select: { name: true, email: true } },
      },
    });

    const docsByShipment = new Map<string, typeof docLists>();
    for (const d of docLists) {
      if (!docsByShipment.has(d.shipmentId)) docsByShipment.set(d.shipmentId, []);
      docsByShipment.get(d.shipmentId)!.push(d);
    }

    const result = shipments.map((shipment) => {
      const requiredTypes = getRequiredDocTypesForShipmentType(shipment.type);
      const docs = docsByShipment.get(shipment.id) ?? [];
      const byType = new Map<string, (typeof docs)[0]>();
      for (const d of docs) {
        const existing = byType.get(d.type);
        if (!existing || d.version > existing.version) byType.set(d.type, d);
      }
      const checklist = requiredTypes.map((type) => {
        const latest = byType.get(type);
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
      const hasMissing = checklist.some((c) => !c.uploaded);
      return {
        shipmentId: shipment.id,
        shipmentRef: shipment.referenceNumber,
        shipmentType: shipment.type,
        checklist,
        hasMissing,
      };
    });

    const filtered = missingOnly ? result.filter((r) => r.hasMissing) : result;

    return NextResponse.json({ data: filtered });
  } catch (error) {
    console.error("GET /api/documents/checklist:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch checklist" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler);
