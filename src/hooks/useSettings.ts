"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const SETTINGS_QUERY_KEY = ["settings"] as const;

async function fetchSettings(): Promise<Record<string, string>> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

/**
 * Fetches all system settings and caches with React Query.
 * Provides getSetting(key, defaultValue) for use in components and by PDF generator (server-side can use getSetting from lib/settings.ts).
 */
export function useSettings() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: fetchSettings,
    staleTime: 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: async (entries: Record<string, string>) => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entries),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message ?? "Failed to update settings");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
  });

  const settings = query.data ?? {};

  function getSetting(key: string, defaultValue?: string): string {
    const v = settings[key];
    return v !== undefined && v !== "" ? v : (defaultValue ?? "");
  }

  return {
    settings,
    getSetting,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
