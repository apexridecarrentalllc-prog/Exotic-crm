"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useUnreadCount, useNotificationsPreview } from "@/hooks/useNotifications";
import { NotificationDropdown } from "./NotificationDropdown";
import { markNotificationRead } from "@/lib/notifications-client";

export function NotificationBell() {
  const queryClient = useQueryClient();
  const { data: unreadData } = useUnreadCount();
  const { data: previewData, isLoading } = useNotificationsPreview();
  const unreadCount = unreadData?.count ?? 0;
  const notifications = previewData?.data ?? [];

  const handleMarkAsRead = async (id: string) => {
    await markNotificationRead(id);
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const trigger = (
    <button
      type="button"
      className="relative p-2 rounded-md hover:bg-muted transition-colors"
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5 text-muted-foreground" />
      {unreadCount > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <NotificationDropdown
      notifications={notifications}
      loading={isLoading}
      onMarkAsRead={handleMarkAsRead}
      trigger={trigger}
    />
  );
}
