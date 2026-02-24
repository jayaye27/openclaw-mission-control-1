"use client";

import { useEffect, useRef } from "react";

// Run task pickup every 3 minutes
const PICKUP_INTERVAL = 3 * 60 * 1000;

/**
 * Hook that periodically triggers the task pickup endpoint.
 * This picks up backlog tasks assigned to agents and delegates them.
 *
 * Add this to a layout component to enable automatic task pickup.
 */
export function useTaskPickup() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    const runPickup = async () => {
      // Prevent concurrent runs
      if (runningRef.current) return;
      runningRef.current = true;

      try {
        const res = await fetch("/api/tasks/pickup", {
          method: "POST",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.delegated?.length > 0) {
            console.log("[TaskPickup] Delegated tasks:", data.delegated);
          }
        }
      } catch (err) {
        // Silent fail - we'll retry next interval
        console.debug("[TaskPickup] Error:", err);
      } finally {
        runningRef.current = false;
      }
    };

    // Run immediately on mount
    runPickup();

    // Then run every PICKUP_INTERVAL
    intervalRef.current = setInterval(runPickup, PICKUP_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}
