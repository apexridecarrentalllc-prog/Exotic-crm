"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { useNotificationsList } from "@/hooks/useNotifications";
import { NotificationItem, type NotificationType } from "@/components/notifications/NotificationItem";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "INVOICE_OVERDUE", label: "Invoice overdue" },
  { value: "PAYMENT_REMINDER", label: "Payment reminder" },
  { value: "SHIPMENT_DELAYED", label: "Shipment delayed" },
  { value: "MISSING_DOCUMENT", label: "Missing document" },
  { value: "SECURITY_ALERT", label: "Security alert" },
  { value: "GENERAL", label: "General" },
];

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filterRead, setFilterRead] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<
    Array<{ id: string; title: string; message: string; type: string; isRead: boolean; relatedId: string | null; relatedType: string | null; createdAt: string }>
  >([]);

  const isReadParam = filterRead === "unread" ? false : undefined;
  useEffect(() => {
    setPage(1);
    setAccumulated([]);
  }, [filterRead, typeFilter]);
  const { data, isLoading } = useNotificationsList({
    page,
    limit: PAGE_SIZE,
    isRead: isReadParam,
    type: typeFilter && typeFilter !== "all" ? typeFilter : undefined,
  });

  useEffect(() => {
    if (!data?.data) return;
    if (page === 1) setAccumulated(data.data);
    else
      setAccumulated((prev) => {
        const ids = new Set(prev.map((i) => i.id));
        const newOnes = data.data.filter((i: { id: string }) => !ids.has(i.id));
        return [...prev, ...newOnes];
      });
  }, [data?.data, page]);

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
    onError: () => toast.error("Failed to mark all as read"),
  });

  const markOneReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (_, id) => {
      setAccumulated((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const items = accumulated;
  const totalPages = data?.totalPages ?? 0;
  const hasMore = page < totalPages;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="View and manage your notifications"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            {markAllReadMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Mark all as read
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant={filterRead === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterRead("all")}
            >
              All
            </Button>
            <Button
              variant={filterRead === "unread" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterRead("unread")}
            >
              Unread
            </Button>
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No notifications
          </div>
        ) : (
          <>
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <NotificationItem
                    id={n.id}
                    title={n.title}
                    message={n.message}
                    type={n.type as NotificationType}
                    isRead={n.isRead}
                    relatedId={n.relatedId}
                    relatedType={n.relatedType}
                    createdAt={n.createdAt}
                    onClick={() => !n.isRead && markOneReadMutation.mutate(n.id)}
                  />
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="border-t p-3 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
