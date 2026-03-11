import { prisma } from "@/lib/prisma";
import { createNotificationForRoles } from "@/lib/notifications";
import { getRequiredDocTypesForShipmentType } from "@/lib/document-constants";
import { subDays, startOfDay } from "date-fns";

/**
 * Find invoices overdue, update status to OVERDUE, notify ACCOUNTS_MANAGER and ADMIN.
 * Skip if an INVOICE_OVERDUE notification for the same invoice was created in the last 24 hours.
 */
export async function checkOverdueInvoices(): Promise<number> {
  const today = startOfDay(new Date());
  const since = subDays(today, 1);

  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      dueDate: { lt: today },
      status: { in: ["SENT", "PARTIALLY_PAID"] },
    },
    select: { id: true, invoiceNumber: true },
  });

  const recentNotificationInvoiceIds = new Set(
    (
      await prisma.notification.findMany({
        where: {
          type: "INVOICE_OVERDUE",
          relatedType: "Invoice",
          createdAt: { gte: since },
        },
        select: { relatedId: true },
      })
    )
      .map((n) => n.relatedId)
      .filter(Boolean) as string[]
  );

  let created = 0;
  for (const inv of overdueInvoices) {
    if (recentNotificationInvoiceIds.has(inv.id)) continue;

    await prisma.invoice.update({
      where: { id: inv.id },
      data: { status: "OVERDUE" },
    });
    await createNotificationForRoles(
      ["ACCOUNTS_MANAGER", "ADMIN"],
      "Invoice overdue",
      `Invoice ${inv.invoiceNumber} is now overdue.`,
      "INVOICE_OVERDUE",
      inv.id,
      "Invoice"
    );
    created++;
  }
  return created;
}

/**
 * Find shipments where status has not changed in > 7 days and status is not CLOSED/DELIVERED.
 * Notify OPERATIONS_STAFF and ADMIN.
 */
export async function checkStuckShipments(): Promise<number> {
  const cutoff = subDays(new Date(), 7);
  const lastStatusChange = await prisma.shipmentStatusHistory.groupBy({
    by: ["shipmentId"],
    _max: { changedAt: true },
  });
  const shipmentIdsStale = lastStatusChange
    .filter((g) => g._max.changedAt && g._max.changedAt < cutoff)
    .map((g) => g.shipmentId);

  if (shipmentIdsStale.length === 0) return 0;

  const stuck = await prisma.shipment.findMany({
    where: {
      id: { in: shipmentIdsStale },
      status: { notIn: ["CLOSED", "DELIVERED"] },
    },
    select: { id: true, referenceNumber: true },
  });

  let created = 0;
  for (const s of stuck) {
    await createNotificationForRoles(
      ["OPERATIONS_STAFF", "ADMIN"],
      "Shipment status unchanged",
      `Shipment ${s.referenceNumber} has had no status change in over 7 days.`,
      "SHIPMENT_DELAYED",
      s.id,
      "Shipment"
    );
    created++;
  }
  return created;
}

/**
 * Find active shipments missing required document types (older than 24h). Notify OPERATIONS_STAFF.
 */
export async function checkMissingDocuments(): Promise<number> {
  const olderThan24h = subDays(new Date(), 1);
  const shipments = await prisma.shipment.findMany({
    where: {
      status: { not: "CANCELLED" },
      createdAt: { lt: olderThan24h },
    },
    select: { id: true, referenceNumber: true, type: true },
  });

  const docsByShipment = await prisma.document.findMany({
    where: { shipmentId: { in: shipments.map((s) => s.id) }, isLatest: true },
    select: { shipmentId: true, type: true },
  });

  const hasTypeByShipment = new Map<string, Set<string>>();
  for (const d of docsByShipment) {
    if (!hasTypeByShipment.has(d.shipmentId)) hasTypeByShipment.set(d.shipmentId, new Set());
    hasTypeByShipment.get(d.shipmentId)!.add(d.type);
  }

  let created = 0;
  for (const s of shipments) {
    const required = getRequiredDocTypesForShipmentType(s.type);
    const has = hasTypeByShipment.get(s.id) ?? new Set();
    const missing = required.filter((t) => !has.has(t));
    if (missing.length === 0) continue;

    await createNotificationForRoles(
      ["OPERATIONS_STAFF"],
      "Missing documents",
      `Shipment ${s.referenceNumber} is missing required document(s).`,
      "MISSING_DOCUMENT",
      s.id,
      "Shipment"
    );
    created++;
  }
  return created;
}
