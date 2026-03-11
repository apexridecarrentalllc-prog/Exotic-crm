"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/Switch";

const NOTIFICATION_TYPES = [
  { key: "INVOICE_OVERDUE", label: "Invoice overdue" },
  { key: "PAYMENT_REMINDER", label: "Payment reminder" },
  { key: "SHIPMENT_DELAYED", label: "Shipment delayed" },
  { key: "MISSING_DOCUMENT", label: "Missing document" },
  { key: "SECURITY_ALERT", label: "Security alert" },
  { key: "GENERAL", label: "General notifications" },
] as const;

const PREF_KEY_PREFIX = "user_pref:";
const PREF_EMAIL_SUFFIX = ":email";

function getPrefKey(userId: string, type: string, email: boolean) {
  return PREF_KEY_PREFIX + userId + ":" + type + (email ? PREF_EMAIL_SUFFIX : "");
}

export function NotificationsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<Record<string, string>>;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (entries: Record<string, string>) => {
      const res = await fetch("/api/settings/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entries),
      });
      if (!res.ok) throw new Error("Failed to update");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });

  const getPref = (type: string, email: boolean) => {
    if (!settings || !userId) return true;
    const key = getPrefKey(userId, type, email);
    const v = settings[key];
    return v !== "false" && v !== "0";
  };

  const setPref = (type: string, email: boolean, value: boolean) => {
    if (!userId) return;
    const key = getPrefKey(userId, type, email);
    updateMutation.mutate({ [key]: value ? "true" : "false" });
  };

  if (!userId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Sign in to manage notification preferences.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose which notification types you receive.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {NOTIFICATION_TYPES.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between rounded-lg border p-4">
                <Label className="cursor-pointer flex-1">{label}</Label>
                <div className="flex items-center gap-6">
                  <span className="text-xs text-muted-foreground">In-app</span>
                  <Switch
                    checked={getPref(key, false)}
                    onCheckedChange={(c) => setPref(key, false, c)}
                  />
                  <span className="text-xs text-muted-foreground">Email</span>
                  <Switch
                    checked={getPref(key, true)}
                    onCheckedChange={(c) => setPref(key, true, c)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
