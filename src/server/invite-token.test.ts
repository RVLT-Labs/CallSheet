import { describe, expect, it } from "vitest";

import { INVITE_TOKEN_EXPIRY_DAYS, isInviteTokenExpired } from "@/server/invite-token";

describe("isInviteTokenExpired", () => {
  const createdAt = new Date("2026-01-01T00:00:00Z");

  it("is not expired right after creation", () => {
    expect(isInviteTokenExpired(createdAt, createdAt)).toBe(false);
  });

  it("is not expired the day before the expiry window closes", () => {
    const almostExpired = new Date(createdAt.getTime() + (INVITE_TOKEN_EXPIRY_DAYS - 1) * 86_400_000);
    expect(isInviteTokenExpired(createdAt, almostExpired)).toBe(false);
  });

  it("is expired once the window has fully elapsed", () => {
    const afterExpiry = new Date(createdAt.getTime() + INVITE_TOKEN_EXPIRY_DAYS * 86_400_000);
    expect(isInviteTokenExpired(createdAt, afterExpiry)).toBe(true);
  });
});
