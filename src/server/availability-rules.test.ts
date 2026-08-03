import { describe, expect, it } from "vitest";

import {
  resolveAvailabilityWindow,
  resolveRulesForDate,
  utcDate,
  type ManualEntry,
  type RecurringRule,
} from "@/server/availability-rules";

function rule(overrides: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: "rule-1",
    dayOfWeek: 2, // Tuesday
    startTime: "09:00",
    endTime: "17:00",
    blockType: "hard",
    label: "Day job",
    effectiveStart: utcDate(2026, 0, 1),
    effectiveEnd: null,
    ...overrides,
  };
}

describe("resolveRulesForDate", () => {
  it("matches a rule on its day of week within the effective range", () => {
    const tuesday = utcDate(2026, 0, 6); // 2026-01-06 is a Tuesday
    expect(resolveRulesForDate([rule()], tuesday).map((r) => r.id)).toEqual(["rule-1"]);
  });

  it("does not match a different day of week", () => {
    const wednesday = utcDate(2026, 0, 7);
    expect(resolveRulesForDate([rule()], wednesday)).toHaveLength(0);
  });

  it("respects effectiveStart and effectiveEnd bounds", () => {
    const before = utcDate(2025, 11, 30); // Tuesday before effectiveStart
    const after = utcDate(2026, 1, 10); // Tuesday after effectiveEnd
    const bounded = rule({ effectiveStart: utcDate(2026, 0, 1), effectiveEnd: utcDate(2026, 0, 31) });
    expect(resolveRulesForDate([bounded], before)).toHaveLength(0);
    expect(resolveRulesForDate([bounded], after)).toHaveLength(0);
  });

  it("returns every matching rule, not just one, when more than one applies to the same date", () => {
    const tuesday = utcDate(2026, 0, 6);
    const morning = rule({ id: "morning", startTime: "06:00", endTime: "09:00" });
    const evening = rule({ id: "evening", startTime: "18:00", endTime: "22:00" });
    expect(resolveRulesForDate([morning, evening], tuesday).map((r) => r.id).sort()).toEqual(["evening", "morning"]);
  });
});

describe("resolveAvailabilityWindow", () => {
  it("marks a day with no manual entry and no matching rule as fully free (no blocks)", () => {
    const resolved = resolveAvailabilityWindow([], [], new Set(), utcDate(2026, 0, 6), utcDate(2026, 0, 6));
    expect(resolved).toHaveLength(0);
  });

  it("applies a matching recurring rule as a block", () => {
    const tuesday = utcDate(2026, 0, 6);
    const resolved = resolveAvailabilityWindow([rule()], [], new Set(), tuesday, tuesday);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({ source: "recurring", blockType: "hard", startTime: "09:00", endTime: "17:00" });
  });

  it("a manual block on a date suppresses recurring generation for that whole date, regardless of order", () => {
    const tuesday = utcDate(2026, 0, 6);
    const manual: ManualEntry[] = [
      { id: "manual-1", date: tuesday, startTime: "12:00", endTime: "13:00", blockType: "soft", label: "Lunch with agent" },
    ];
    const resolved = resolveAvailabilityWindow([rule()], manual, new Set(), tuesday, tuesday);

    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({ source: "manual", blockType: "soft", startTime: "12:00", endTime: "13:00" });
  });

  it("leaves other matching dates governed by the rule when only one date has a manual override", () => {
    const firstTuesday = utcDate(2026, 0, 6);
    const secondTuesday = utcDate(2026, 0, 13);
    const manual: ManualEntry[] = [
      { id: "manual-1", date: firstTuesday, startTime: "12:00", endTime: "13:00", blockType: "soft", label: null },
    ];
    const resolved = resolveAvailabilityWindow([rule()], manual, new Set(), firstTuesday, secondTuesday);

    const first = resolved.filter((r) => r.date.getTime() === firstTuesday.getTime());
    const second = resolved.filter((r) => r.date.getTime() === secondTuesday.getTime());

    expect(first.every((r) => r.source === "manual")).toBe(true);
    expect(second.every((r) => r.source === "recurring")).toBe(true);
  });

  it("a date cleared to fully free (override marker, zero manual blocks) suppresses recurring too", () => {
    const tuesday = utcDate(2026, 0, 6);
    const resolved = resolveAvailabilityWindow([rule()], [], new Set(["2026-01-06"]), tuesday, tuesday);
    expect(resolved).toHaveLength(0);
  });

  it("stacks multiple blocks on the same date instead of overwriting", () => {
    const tuesday = utcDate(2026, 0, 6);
    const manual: ManualEntry[] = [
      { id: "manual-1", date: tuesday, startTime: "09:00", endTime: "12:00", blockType: "hard", label: "Shift A" },
      { id: "manual-2", date: tuesday, startTime: "18:00", endTime: "20:00", blockType: "soft", label: "Dinner" },
    ];
    const resolved = resolveAvailabilityWindow([], manual, new Set(), tuesday, tuesday);
    expect(resolved).toHaveLength(2);
  });
});
