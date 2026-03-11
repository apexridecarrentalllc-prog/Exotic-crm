import { prisma } from "@/lib/prisma";
import type { ShipmentType } from "@prisma/client";

/**
 * Generates a collision-safe shipment reference (e.g. IMP-2025-0001, EXP-2025-0001).
 * Uses a DB transaction to read and increment the sequence atomically.
 * Use from server/API only (imports prisma).
 */
export async function generateShipmentRef(type: ShipmentType): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = type === "IMPORT" ? "IMP" : "EXP";

  const seq = await prisma.$transaction(async (tx) => {
    const row = await tx.shipmentSequence.upsert({
      where: { year_type: { year, type } },
      create: { year, type, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    return row.lastNumber;
  });

  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

type TxClient = { shipmentSequence: typeof prisma.shipmentSequence };

/**
 * Same as generateShipmentRef but using a transaction client (for bulk operations).
 */
export async function generateShipmentRefInTx(tx: TxClient, type: ShipmentType): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = type === "IMPORT" ? "IMP" : "EXP";
  const row = await tx.shipmentSequence.upsert({
    where: { year_type: { year, type } },
    create: { year, type, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });
  return `${prefix}-${year}-${String(row.lastNumber).padStart(4, "0")}`;
}
