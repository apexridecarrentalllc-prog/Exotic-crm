"use client";

import { useQuery } from "@tanstack/react-query";

export const BRANDING_QUERY_KEY = ["branding"] as const;

async function fetchBranding(): Promise<{ companyLogo: string | null; companyName?: string }> {
  const res = await fetch("/api/settings/branding");
  if (!res.ok) throw new Error("Failed to fetch branding");
  return res.json();
}

/**
 * Fetches branding (company logo and name) for sidebar and header.
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
    // Until the request returns (or if it fails) show the configured fallback, never the old product name.
    companyName: query.data?.companyName ?? process.env.NEXT_PUBLIC_COMPANY_NAME ?? "PISTIS",
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
