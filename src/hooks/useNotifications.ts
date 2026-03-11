"use client";

import { useQuery } from "@tanstack/react-query";

const UNREAD_COUNT_KEY = ["notifications", "unread-count"] as const;
const PREVIEW_KEY = ["notifications", "preview"] as const;

export function useUnreadCount() {
  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: async () => {
      const res = await fetch("/api/notifications/unread-count");
      if (!res.ok) throw new Error("Failed to fetch unread count");
      const data = await res.json();
      return { count: data.count as number };
    },
    refetchInterval: 60 * 1000,
  });
}

export function useNotificationsPreview() {
  return useQuery({
    queryKey: PREVIEW_KEY,
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=5&page=1");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const data = await res.json();
      return { data: data.data ?? [] };
    },
    staleTime: 30 * 1000,
  });
}

export function useNotificationsList(params: {
  page: number;
  limit: number;
  isRead?: boolean;
  type?: string;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(params.page));
  searchParams.set("limit", String(params.limit));
  if (params.isRead !== undefined) searchParams.set("isRead", String(params.isRead));
  if (params.type) searchParams.set("type", params.type);

  return useQuery({
    queryKey: ["notifications", "list", params.page, params.limit, params.isRead, params.type],
    queryFn: async () => {
      const res = await fetch(`/api/notifications?${searchParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
  });
}
