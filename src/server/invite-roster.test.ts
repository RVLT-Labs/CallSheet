import { describe, expect, it } from "vitest";

import {
  REMINDER_THRESHOLD_DAYS,
  canNudgeInvite,
  countRsvpStatuses,
  inviteStatusLabel,
  isInviteDueForReminder,
  removalOutcomeForInvite,
  resolveEffectiveTime,
  shouldNotifyConfirmedEventChange,
} from "@/server/invite-roster";

describe("resolveEffectiveTime", () => {
  it("falls back to the day's default when there is no override", () => {
    expect(resolveEffectiveTime("08:00", null)).toBe("08:00");
    expect(resolveEffectiveTime("08:00", undefined)).toBe("08:00");
    expect(resolveEffectiveTime("08:00", "")).toBe("08:00");
  });

  it("uses the override when set", () => {
    expect(resolveEffectiveTime("08:00", "06:30")).toBe("06:30");
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

describe("inviteStatusLabel", () => {
  it("shows the plain status when it came from the crew member's own response", () => {
    expect(inviteStatusLabel("accepted", "crew")).toBe("Accepted");
    expect(inviteStatusLabel("declined", "crew")).toBe("Declined");
    expect(inviteStatusLabel("pending", "crew")).toBe("Pending");
  });

  it("flags a status the organiser set manually, so it never reads as the crew member's own response", () => {
    expect(inviteStatusLabel("accepted", "organiser")).toBe("Accepted (set by organiser)");
    expect(inviteStatusLabel("declined", "organiser")).toBe("Declined (set by organiser)");
    expect(inviteStatusLabel("pending", "organiser")).toBe("Pending (set by organiser)");
  });
});

describe("shouldNotifyConfirmedEventChange", () => {
  it("never notifies for a Tentative shoot, since it has no invites yet", () => {
    expect(shouldNotifyConfirmedEventChange("tentative", 1)).toBe(false);
    expect(shouldNotifyConfirmedEventChange("tentative", 0)).toBe(false);
  });

  it("notifies for a Confirmed shoot only when something actually changed", () => {
    expect(shouldNotifyConfirmedEventChange("confirmed", 0)).toBe(false);
    expect(shouldNotifyConfirmedEventChange("confirmed", 1)).toBe(true);
    expect(shouldNotifyConfirmedEventChange("confirmed", 2)).toBe(true);
  });
});

describe("isInviteDueForReminder", () => {
  const sentAt = new Date("2026-01-01T00:00:00Z");
  const justUnderThreshold = new Date(sentAt.getTime() + (REMINDER_THRESHOLD_DAYS * 86_400_000 - 1));
  const atThreshold = new Date(sentAt.getTime() + REMINDER_THRESHOLD_DAYS * 86_400_000);

  it("is not due before the threshold elapses", () => {
    expect(isInviteDueForReminder({ status: "pending", sentAt, lastReminderSentAt: null }, justUnderThreshold)).toBe(
      false,
    );
  });

  it("is due once the threshold elapses", () => {
    expect(isInviteDueForReminder({ status: "pending", sentAt, lastReminderSentAt: null }, atThreshold)).toBe(true);
  });

  it("is never due twice — a prior reminder blocks another", () => {
    expect(
      isInviteDueForReminder({ status: "pending", sentAt, lastReminderSentAt: atThreshold }, atThreshold),
    ).toBe(false);
  });

  it("is never due for someone who already responded", () => {
    expect(isInviteDueForReminder({ status: "accepted", sentAt, lastReminderSentAt: null }, atThreshold)).toBe(
      false,
    );
    expect(isInviteDueForReminder({ status: "declined", sentAt, lastReminderSentAt: null }, atThreshold)).toBe(
      false,
    );
  });

  it("is never due if the invite was never actually sent", () => {
    expect(isInviteDueForReminder({ status: "pending", sentAt: null, lastReminderSentAt: null }, atThreshold)).toBe(
      false,
    );
  });
});
