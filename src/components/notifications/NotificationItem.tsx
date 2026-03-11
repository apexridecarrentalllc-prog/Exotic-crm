"use client";

import Link from "next/link";
import { FileText, AlertCircle, Truck, FileWarning, ShieldAlert, Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export type NotificationType =
  | "INVOICE_OVERDUE"
  | "PAYMENT_REMINDER"
  | "SHIPMENT_DELAYED"
  | "MISSING_DOCUMENT"
  | "SECURITY_ALERT"
  | "GENERAL";

const TYPE_ICONS: Record<NotificationType, LucideIcon> = {
  INVOICE_OVERDUE: AlertCircle,
  PAYMENT_REMINDER: FileText,
  SHIPMENT_DELAYED: Truck,
  MISSING_DOCUMENT: FileWarning,
  SECURITY_ALERT: ShieldAlert,
  GENERAL: Bell,
};

function getRelatedLink(relatedId: string | null, relatedType: string | null): string | null {
  if (!relatedId || !relatedType) return null;
  const t = relatedType.toLowerCase();
  if (t === "invoice") return `/invoices/${relatedId}`;
  if (t === "shipment") return `/shipments/${relatedId}`;
  if (t === "company") return `/companies/${relatedId}`;
  if (t === "payment") return "/transactions";
  return null;
}

export interface NotificationItemProps {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  relatedId: string | null;
  relatedType: string | null;
  createdAt: string;
  onClick?: () => void;
  compact?: boolean;
  className?: string;
}

export function NotificationItem(props: NotificationItemProps) {
  const {
    title,
    message,
    type,
    isRead,
    relatedId,
    relatedType,
    createdAt,
    onClick,
    compact = false,
    className,
  } = props;
  const Icon = (TYPE_ICONS[type] ?? Bell) as LucideIcon;
  const href = getRelatedLink(relatedId, relatedType);
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  const iconClass =
    type === "INVOICE_OVERDUE" || type === "SECURITY_ALERT"
      ? "bg-destructive/10 text-destructive"
      : type === "MISSING_DOCUMENT" || type === "SHIPMENT_DELAYED"
        ? "bg-amber-500/10 text-amber-600"
        : "bg-muted text-muted-foreground";

  const content = (
    <>
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", iconClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          {!isRead && (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-medium", !isRead && "text-foreground")}>{title}</p>
            {!compact && (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{message}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{timeAgo}</p>
          </div>
        </div>
      </div>
    </>
  );

  const sharedClass = cn(
    "flex gap-3 rounded-lg p-3 text-left transition-colors",
    !isRead && "bg-primary/5",
    compact && "py-2",
    className
  );

  if (href && onClick) {
    return (
      <Link href={href} className={cn(sharedClass, "hover:bg-muted/50")} onClick={onClick}>
        {content}
      </Link>
    );
  }
  if (href) {
    return <Link href={href} className={cn(sharedClass, "hover:bg-muted/50")}>{content}</Link>;
  }
  return (
    <div className={sharedClass} role="button" tabIndex={0} onClick={onClick}>
      {content}
    </div>
  );
}
