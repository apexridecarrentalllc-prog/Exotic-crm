import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { withAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { bulkImportShipmentRowSchema } from "@/lib/validations";
import { generateShipmentRefInTx } from "@/lib/shipment-ref";

const EXPECTED_COLUMNS = ["Type", "Origin", "Destination", "GoodsDescription", "ContainerNumber", "CargoValue", "OrderDate"];

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const keyMap: Record<string, string> = {};
  EXPECTED_COLUMNS.forEach((col) => {
    const lower = col.toLowerCase();
    const found = Object.keys(row).find((k) => k.trim().toLowerCase() === lower);
    if (found) keyMap[found] = col;
  });
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const mapped = keyMap[k] ?? k;
    out[mapped] = v;
  }
  return out;
}

async function postHandler(request: NextRequest) {
  try {
    const session = await (await import("@/lib/auth")).auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Bad Request", message: "Missing or invalid file. Use form field 'file' with an Excel file." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return NextResponse.json(
        { error: "Bad Request", message: "Excel file has no sheets." },
        { status: 400 }
      );
    }
    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    const errors: { row: number; error: string }[] = [];
    const created: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const rowIndex = i + 2;
        const raw = normalizeRow(rows[i]);
        const parsed = bulkImportShipmentRowSchema.safeParse(raw);
        if (!parsed.success) {
          const firstIssue = parsed.error.issues[0];
          errors.push({ row: rowIndex, error: firstIssue?.message ?? "Validation failed" });
          continue;
        }
        const row = parsed.data;
        try {
          const ref = await generateShipmentRefInTx(tx, row.Type);
          const orderDate = row.OrderDate instanceof Date ? row.OrderDate : new Date(row.OrderDate);
          const shipment = await tx.shipment.create({
            data: {
              referenceNumber: ref,
              type: row.Type,
              status: "ORDER_CREATED",
              origin: row.Origin,
              destination: row.Destination,
              goodsDescription: row.GoodsDescription,
              containerNumber: row.ContainerNumber || undefined,
              cargoValue: row.CargoValue != null && row.CargoValue > 0 ? row.CargoValue : undefined,
              orderDate,
              createdById: userId,
            },
          });
          await tx.shipmentStatusHistory.create({
            data: {
              shipmentId: shipment.id,
              status: "ORDER_CREATED",
              changedById: userId,
              notes: "Bulk import",
            },
          });
          created.push(shipment.id);
        } catch (err) {
          errors.push({
            row: rowIndex,
            error: err instanceof Error ? err.message : "Failed to create shipment",
          });
        }
      }
    });

    return NextResponse.json({
      created: created.length,
      createdIds: created,
      errors: errors.map((e) => ({ row: e.row, message: e.error })),
    });
  } catch (error) {
    console.error("POST /api/shipments/bulk-import:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Bulk import failed" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler, {
  roles: ["SUPER_ADMIN", "ADMIN", "OPERATIONS_STAFF"],
});
