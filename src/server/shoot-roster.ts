// Pure RSVP/roster business rules (issue #9 acceptance criteria). Kept free of
// Prisma/DB calls so the remove/nudge/call-time rules are unit-testable
// without a database — see shoot-roster.test.ts.

export type InviteStatus = "pending" | "accepted" | "declined";

/** Per-person call-time override falls back to that day's default when unset. */
export function resolveEffectiveCallTime(dayDefaultCallTime: string, override: string | null | undefined) {
  return override && override.length > 0 ? override : dayDefaultCallTime;
}

/** Nudge only ever targets a still-pending invite, never someone who already responded. */
export function canNudgeInvite(status: InviteStatus) {
  return status === "pending";
}

/**
 * Removing someone who hasn't responded yet has no history worth keeping, so
 * the slot (and any pending invite) is deleted outright. Removing someone who
 * already responded must preserve that RSVP record (issue #9 acceptance
 * criteria), so the slot is soft-removed instead.
 */
export function removalOutcomeForInvite(status: InviteStatus | null): "hard-delete" | "soft-remove" {
  return status === "accepted" || status === "declined" ? "soft-remove" : "hard-delete";
}

export type RsvpCounts = { accepted: number; declined: number; pending: number };

export function countRsvpStatuses(invites: { status: InviteStatus }[]): RsvpCounts {
  const counts: RsvpCounts = { accepted: 0, declined: 0, pending: 0 };
  for (const invite of invites) counts[invite.status]++;
  return counts;
}
