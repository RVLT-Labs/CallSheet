// Pure RSVP/roster business rules (issue #9 acceptance criteria). Kept free of
// Prisma/DB calls so the remove/nudge/call-time rules are unit-testable
// without a database — see shoot-roster.test.ts.

export type InviteStatus = "pending" | "accepted" | "declined";

// Who last set an invite's status — mirrors the availability manual-overrides-recurring
// precedence rule: an organiser override holds until the crew member responds via their
// own accept/decline link, which always wins (see respondToInvite in shoot-invite-email.ts).
export type InviteResponseSource = "crew" | "organiser";

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

const INVITE_STATUS_LABEL: Record<InviteStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
};

/** Flags an organiser-set status in the label everywhere it's shown, so it never reads as the crew member's own response. */
export function inviteStatusLabel(status: InviteStatus, responseSource: InviteResponseSource) {
  const base = INVITE_STATUS_LABEL[status];
  return responseSource === "organiser" ? `${base} (set by organiser)` : base;
}

export type RsvpCounts = { accepted: number; declined: number; pending: number };

export function countRsvpStatuses(invites: { status: InviteStatus }[]): RsvpCounts {
  const counts: RsvpCounts = { accepted: 0, declined: 0, pending: 0 };
  for (const invite of invites) counts[invite.status]++;
  return counts;
}

/**
 * A Tentative shoot has no invites to notify (issue #9), so an edit is silent
 * either way. A Confirmed shoot's time/location change must never be a silent
 * dashboard-only update (issue #10 acceptance criteria) — this is the gate
 * that decides whether an edit fires notification emails.
 */
export function shouldNotifyShootChange(status: "tentative" | "confirmed", changedFieldCount: number) {
  return status === "confirmed" && changedFieldCount > 0;
}

export const REMINDER_THRESHOLD_DAYS = 3;

/**
 * A Pending invite gets exactly one automatic reminder once it's been
 * sitting long enough (issue #10 acceptance criteria) — the
 * lastReminderSentAt guard is what makes it "exactly one," never repeated.
 */
export function isInviteDueForReminder(
  invite: { status: InviteStatus; sentAt: Date | null; lastReminderSentAt: Date | null },
  now: Date,
) {
  if (invite.status !== "pending") return false;
  if (!invite.sentAt) return false;
  if (invite.lastReminderSentAt) return false;

  const dueAt = invite.sentAt.getTime() + REMINDER_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() >= dueAt;
}
