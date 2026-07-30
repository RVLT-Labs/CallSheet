import { describe, expect, it } from "vitest";

import {
  canNudgeInvite,
  countRsvpStatuses,
  removalOutcomeForInvite,
  resolveEffectiveCallTime,
} from "@/server/shoot-roster";

describe("resolveEffectiveCallTime", () => {
  it("falls back to the day's default when there is no override", () => {
    expect(resolveEffectiveCallTime("08:00", null)).toBe("08:00");
    expect(resolveEffectiveCallTime("08:00", undefined)).toBe("08:00");
    expect(resolveEffectiveCallTime("08:00", "")).toBe("08:00");
  });

  it("uses the override when set", () => {
    expect(resolveEffectiveCallTime("08:00", "06:30")).toBe("06:30");
  });
});

describe("canNudgeInvite", () => {
  it("allows nudging only a pending invite", () => {
    expect(canNudgeInvite("pending")).toBe(true);
    expect(canNudgeInvite("accepted")).toBe(false);
    expect(canNudgeInvite("declined")).toBe(false);
  });
});

describe("removalOutcomeForInvite", () => {
  it("hard-deletes when there is no response to preserve", () => {
    expect(removalOutcomeForInvite(null)).toBe("hard-delete");
    expect(removalOutcomeForInvite("pending")).toBe("hard-delete");
  });

  it("soft-removes once the person has already responded, to preserve history", () => {
    expect(removalOutcomeForInvite("accepted")).toBe("soft-remove");
    expect(removalOutcomeForInvite("declined")).toBe("soft-remove");
  });
});

describe("countRsvpStatuses", () => {
  it("tallies accepted/declined/pending", () => {
    expect(
      countRsvpStatuses([
        { status: "accepted" },
        { status: "accepted" },
        { status: "declined" },
        { status: "pending" },
      ]),
    ).toEqual({ accepted: 2, declined: 1, pending: 1 });
  });

  it("returns zeros for an empty roster", () => {
    expect(countRsvpStatuses([])).toEqual({ accepted: 0, declined: 0, pending: 0 });
  });
});
