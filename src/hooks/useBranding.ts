"use client";

import { useQuery } from "@tanstack/react-query";

export const BRANDING_QUERY_KEY = ["branding"] as const;

async function fetchBranding(): Promise<{ companyLogo: string | null }> {
  const res = await fetch("/api/settings/branding");
  if (!res.ok) throw new Error("Failed to fetch branding");
  return res.json();
}

/**
 * Fetches branding (e.g. company logo) for sidebar and header.
 * Available to any authenticated user.
 */
export function useBranding() {
  const query = useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: fetchBranding,
    staleTime: 5 * 60 * 1000,
  });
  return {
    companyLogo: query.data?.companyLogo ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
