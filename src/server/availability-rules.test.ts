import { describe, expect, it } from "vitest";

import {
  resolveAvailabilityWindow,
  resolveRuleForDate,
  utcDate,
  type ManualEntry,
  type RecurringRule,
} from "@/server/availability-rules";

function rule(overrides: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: "rule-1",
    dayOfWeek: 2, // Tuesday
    halfDay: null,
    tier: "unavailable",
    label: "Rehearsal",
    effectiveStart: utcDate(2026, 0, 1),
    effectiveEnd: null,
    createdAt: utcDate(2026, 0, 1),
    ...overrides,
  };
}

describe("resolveRuleForDate", () => {
  it("matches a rule on its day of week within the effective range", () => {
    const tuesday = utcDate(2026, 0, 6); // 2026-01-06 is a Tuesday
    expect(resolveRuleForDate([rule()], tuesday, "AM")?.id).toBe("rule-1");
  });

  it("does not match a different day of week", () => {
    const wednesday = utcDate(2026, 0, 7);
    expect(resolveRuleForDate([rule()], wednesday, "AM")).toBeNull();
  });

  it("respects halfDay when the rule is scoped to one", () => {
    const tuesday = utcDate(2026, 0, 6);
    const amOnly = rule({ halfDay: "AM" });
    expect(resolveRuleForDate([amOnly], tuesday, "AM")?.id).toBe("rule-1");
    expect(resolveRuleForDate([amOnly], tuesday, "PM")).toBeNull();
  });

  it("respects effectiveStart and effectiveEnd bounds", () => {
    const before = utcDate(2025, 11, 30); // Tuesday before effectiveStart
    const after = utcDate(2026, 1, 10); // Tuesday after effectiveEnd
    const bounded = rule({ effectiveStart: utcDate(2026, 0, 1), effectiveEnd: utcDate(2026, 0, 31) });
    expect(resolveRuleForDate([bounded], before, "AM")).toBeNull();
    expect(resolveRuleForDate([bounded], after, "AM")).toBeNull();
  });

  it("picks the most recently created rule when two rules conflict", () => {
    const tuesday = utcDate(2026, 0, 6);
    const older = rule({ id: "old", tier: "best", createdAt: utcDate(2026, 0, 1) });
    const newer = rule({ id: "new", tier: "unavailable", createdAt: utcDate(2026, 0, 2) });
    expect(resolveRuleForDate([older, newer], tuesday, "AM")?.id).toBe("new");
  });
});

describe("resolveAvailabilityWindow", () => {
  it("marks a day with no manual entry and no matching rule as unknown (absent)", () => {
    const resolved = resolveAvailabilityWindow([], [], utcDate(2026, 0, 6), utcDate(2026, 0, 6));
    expect(resolved).toHaveLength(0);
  });

  it("applies a matching recurring rule to both half-days when halfDay is null", () => {
    const tuesday = utcDate(2026, 0, 6);
    const resolved = resolveAvailabilityWindow([rule()], [], tuesday, tuesday);
    expect(resolved).toHaveLength(2);
    expect(resolved.every((r) => r.source === "recurring" && r.tier === "unavailable")).toBe(true);
  });

  it("a manual entry always overrides a matching recurring rule, regardless of order", () => {
    const tuesday = utcDate(2026, 0, 6);
    const manual: ManualEntry[] = [{ date: tuesday, halfDay: "AM", tier: "best" }];
    const resolved = resolveAvailabilityWindow([rule()], manual, tuesday, tuesday);

    const am = resolved.find((r) => r.halfDay === "AM");
    const pm = resolved.find((r) => r.halfDay === "PM");

    expect(am?.source).toBe("manual");
    expect(am?.tier).toBe("best");
    // The rule continues to apply to the half-day that wasn't manually overridden.
    expect(pm?.source).toBe("recurring");
    expect(pm?.tier).toBe("unavailable");
  });

  it("leaves other matching dates governed by the rule when only one date is overridden", () => {
    const firstTuesday = utcDate(2026, 0, 6);
    const secondTuesday = utcDate(2026, 0, 13);
    const manual: ManualEntry[] = [{ date: firstTuesday, halfDay: "AM", tier: "best" }];
    const resolved = resolveAvailabilityWindow([rule()], manual, firstTuesday, secondTuesday);

    const overridden = resolved.find(
      (r) => r.date.getTime() === firstTuesday.getTime() && r.halfDay === "AM",
    );
    const untouched = resolved.find(
      (r) => r.date.getTime() === secondTuesday.getTime() && r.halfDay === "AM",
    );

    expect(overridden?.source).toBe("manual");
    expect(untouched?.source).toBe("recurring");
  });
});
