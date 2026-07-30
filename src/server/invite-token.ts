// Pure invite-token expiry logic (spec §7: "a signed, single-use/expiring token
// link"). Kept free of Prisma/DB calls so it's unit-testable — see
// invite-token.test.ts. The token itself is a random value stored on
// ShootInvite (spec §7's "random token" option); this is the "expiring" half
// of that decision — a stale, possibly-leaked email link stops working, while
// someone genuinely changing their RSVP within the window can still do so.

export const INVITE_TOKEN_EXPIRY_DAYS = 90;

export function isInviteTokenExpired(createdAt: Date, now: Date) {
  const expiresAt = createdAt.getTime() + INVITE_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() >= expiresAt;
}
