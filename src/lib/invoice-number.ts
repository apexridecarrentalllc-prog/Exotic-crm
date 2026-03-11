import { prisma } from "@/lib/prisma";

/**
 * Generates a collision-safe invoice number (e.g. INV-2025-0001).
 * Uses a DB transaction to read and increment the sequence atomically.
 * Use from server/API only (imports prisma).
 */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const seq = await prisma.$transaction(async (tx) => {
    const row = await tx.invoiceSequence.upsert({
      where: { year },
      create: { year, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    return row.lastNumber;
  });

  return `INV-${year}-${String(seq).padStart(4, "0")}`;
}

type TxClient = { invoiceSequence: typeof prisma.invoiceSequence };

/**
 * Same as generateInvoiceNumber but using a transaction client (for use inside existing transactions).
 */
export async function generateInvoiceNumberInTx(tx: TxClient): Promise<string> {
  const year = new Date().getFullYear();
  const row = await tx.invoiceSequence.upsert({
    where: { year },
    create: { year, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });
  return `INV-${year}-${String(row.lastNumber).padStart(4, "0")}`;
}

/**
 * Generates a collision-safe credit note number (e.g. CN-2025-0001).
 */
export async function generateCreditNoteNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const seq = await prisma.$transaction(async (tx) => {
    const row = await tx.creditNoteSequence.upsert({
      where: { year },
      create: { year, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    return row.lastNumber;
  });

  return `CN-${year}-${String(seq).padStart(4, "0")}`;
}
