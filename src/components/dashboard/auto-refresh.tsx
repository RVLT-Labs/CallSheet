"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Polling, not websockets (spec §7) — re-runs the server component tree on
 * an interval so the organiser dashboard's RSVP roster reflects Accept/
 * Decline changes without a manual refresh (issue #11 acceptance criteria).
 */
export function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
