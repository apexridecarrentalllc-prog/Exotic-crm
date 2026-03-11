import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/types";

export type NotificationType =
  | "INVOICE_OVERDUE"
  | "PAYMENT_REMINDER"
  | "SHIPMENT_DELAYED"
  | "MISSING_DOCUMENT"
  | "SECURITY_ALERT"
  | "GENERAL";

/**
 * Create a single notification for a user.
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType,
  relatedId?: string | null,
  relatedType?: string | null
) {
  await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      relatedId: relatedId ?? undefined,
      relatedType: relatedType ?? undefined,
    },
  });
}

/**
 * Create the same notification for all users with the given role.
 */
export async function createNotificationForRole(
  role: UserRole,
  title: string,
  message: string,
  type: NotificationType,
  relatedId?: string | null,
  relatedType?: string | null
) {
  const users = await prisma.user.findMany({
    where: { role, isActive: true },
    select: { id: true },
  });
  if (users.length === 0) return;
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      title,
      message,
      type,
      relatedId: relatedId ?? undefined,
      relatedType: relatedType ?? undefined,
    })),
  });
}

/**
 * Create the same notification for all users with any of the given roles (each user at most once).
 */
export async function createNotificationForRoles(
  roles: UserRole[],
  title: string,
  message: string,
  type: NotificationType,
  relatedId?: string | null,
  relatedType?: string | null
) {
  const users = await prisma.user.findMany({
    where: { role: { in: roles }, isActive: true },
    select: { id: true },
    distinct: ["id"],
  });
  if (users.length === 0) return;
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      title,
      message,
      type,
      relatedId: relatedId ?? undefined,
      relatedType: relatedType ?? undefined,
    })),
  });
}
