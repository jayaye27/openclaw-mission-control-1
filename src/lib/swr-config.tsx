"use client";

import { SWRConfig } from "swr";
import { ReactNode } from "react";

// Default fetcher for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.");
    throw error;
  }
  return res.json();
};

// Global SWR configuration
export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        // Cache data for 5 minutes before considering it stale
        dedupingInterval: 5 * 60 * 1000,
        // Revalidate on focus (when user switches back to tab)
        revalidateOnFocus: true,
        // Don't revalidate on reconnect by default (saves bandwidth)
        revalidateOnReconnect: false,
        // Keep previous data while revalidating
        keepPreviousData: true,
        // Retry on error (3 times)
        errorRetryCount: 3,
        // Show stale data immediately, then revalidate in background
        revalidateIfStale: true,
        // Don't suspend - show loading states instead
        suspense: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
