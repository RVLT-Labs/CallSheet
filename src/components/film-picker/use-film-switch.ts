"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

/**
 * Shared by FilmPicker and ProfileMenu (both host the same film-switcher
 * list). Returns which organization is mid-switch so the caller can keep
 * the picker open with visible feedback instead of closing it immediately
 * and leaving the page looking frozen while setActive + refresh land.
 */
export function useFilmSwitch(activeOrganizationId: string | null) {
  const router = useRouter();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  async function switchTo(organizationId: string) {
    if (organizationId === activeOrganizationId) return false;
    setSwitchingId(organizationId);
    await authClient.organization.setActive({ organizationId });
    router.refresh();
    return true;
  }

  return { switchingId, switchTo };
}
