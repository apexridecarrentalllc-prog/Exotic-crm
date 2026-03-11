"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown";
import { NotificationItem, type NotificationType } from "./NotificationItem";
import { Loader2 } from "lucide-react";

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedId: string | null;
  relatedType: string | null;
  createdAt: string;
}

interface NotificationDropdownProps {
  notifications: NotificationRecord[];
  loading?: boolean;
  onMarkAsRead?: (id: string) => void;
  onOpenChange?: (open: boolean) => void;
  trigger: React.ReactNode;
}

const MAX_PREVIEW = 5;

export function NotificationDropdown({
  notifications,
  loading = false,
  onMarkAsRead,
  onOpenChange,
  trigger,
}: NotificationDropdownProps) {
  const list = notifications.slice(0, MAX_PREVIEW);

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          <Link
            href="/notifications"
            className="text-xs text-primary hover:underline"
            onClick={() => onOpenChange?.(false)}
          >
            View all
          </Link>
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : list.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="py-1">
              {list.map((n) => (
                <NotificationItem
                  key={n.id}
                  id={n.id}
                  title={n.title}
                  message={n.message}
                  type={n.type as NotificationType}
                  isRead={n.isRead}
                  relatedId={n.relatedId}
                  relatedType={n.relatedType}
                  createdAt={n.createdAt}
                  compact
                  onClick={() => {
                    onMarkAsRead?.(n.id);
                    onOpenChange?.(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
