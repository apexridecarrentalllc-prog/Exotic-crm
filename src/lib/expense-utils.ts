import type { Prisma } from "@prisma/client";
import { toNum } from "@/lib/utils";

export const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

/** Start of a "YYYY-MM-DD" day in UTC, or undefined when the text is not a valid date. */
export function parseDayStart(value: string | null | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** End of a "YYYY-MM-DD" day in UTC, or undefined when the text is not a valid date. */
export function parseDayEnd(value: string | null | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

type ExpenseWithRelations = Prisma.ExpenseGetPayload<{
  include: { shipment: { select: { referenceNumber: true } }; recordedBy: { select: { name: true } } };
}>;

export const expenseInclude = {
  shipment: { select: { referenceNumber: true } },
  recordedBy: { select: { name: true } },
} satisfies Prisma.ExpenseInclude;

/** The JSON shape the Expenses screen works with. */
export function serializeExpense(e: ExpenseWithRelations) {
  return {
    id: e.id,
    expenseNumber: e.expenseNumber,
    expenseDate: e.expenseDate.toISOString().slice(0, 10),
    category: e.category,
    amount: toNum(e.amount),
    currency: "AED",
    description: e.description,
    vendor: e.vendor,
    method: e.method,
    shipmentId: e.shipmentId,
    shipmentRef: e.shipment?.referenceNumber ?? null,
    recordedByName: e.recordedBy.name,
    createdAt: e.createdAt.toISOString(),
  };
}
