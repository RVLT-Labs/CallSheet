import { describe, expect, it } from "vitest";

import { combineDayTier, rankCandidates, type CandidateInput, type PersonAvailability } from "@/server/scheduling-suggestions";
import { utcDate } from "@/server/availability-rules";

function availability(entries: Record<string, { am?: string; pm?: string }>): PersonAvailability {
  const map: PersonAvailability = new Map();
  for (const [dateIso, tiers] of Object.entries(entries)) {
    map.set(dateIso, { am: (tiers.am as never) ?? null, pm: (tiers.pm as never) ?? null });
  }
  return map;
}

function baseInput(overrides: Partial<CandidateInput> = {}): CandidateInput {
  return {
    required: [],
    general: [],
    numDays: 1,
    halfDayPreference: "EITHER",
    searchStart: utcDate(2026, 6, 1),
    searchEnd: utcDate(2026, 6, 7),
    availabilityByMembership: new Map(),
    ...overrides,
  };
}

describe("combineDayTier", () => {
  it("returns the requested half directly for AM/PM preference", () => {
    expect(combineDayTier("best", "unavailable", "AM")).toBe("best");
    expect(combineDayTier("best", "unavailable", "PM")).toBe("unavailable");
  });

  it("EITHER is only as good as the worse half", () => {
    expect(combineDayTier("best", "best", "EITHER")).toBe("best");
    expect(combineDayTier("best", "ok", "EITHER")).toBe("ok");
    expect(combineDayTier("best", "unavailable", "EITHER")).toBe("unavailable");
    expect(combineDayTier(null, null, "EITHER")).toBeNull();
    expect(combineDayTier("best", null, "EITHER")).toBe("best");
  });
});

describe("rankCandidates", () => {
  it("never suggests a date where a required (real) person is unavailable on any day", () => {
    const input = baseInput({
      required: [{ kind: "member", membershipId: "req1", name: "Req" }],
      availabilityByMembership: new Map([
        ["req1", availability({ "2026-07-01": { am: "unavailable", pm: "unavailable" } })],
      ]),
    });
    const results = rankCandidates(input);
    expect(results.some((r) => r.startDateIso === "2026-07-01")).toBe(false);
  });

  it("uses the worst-day rule for multi-day candidates, not an average that could mask a bad day", () => {
    const input = baseInput({
      numDays: 2,
      required: [{ kind: "member", membershipId: "req1", name: "Req" }],
      availabilityByMembership: new Map([
        [
          "req1",
          availability({
            "2026-07-01": { am: "best", pm: "best" },
            "2026-07-02": { am: "unavailable", pm: "unavailable" },
          }),
        ],
      ]),
    });
    const results = rankCandidates(input);
    // The 2-day block starting 07-01 includes the unavailable 07-02 -> disqualified,
    // even though the average of "best" + "unavailable" might look survivable.
    expect(results.some((r) => r.startDateIso === "2026-07-01")).toBe(false);
  });

  it("never disqualifies a candidate based on general crew availability", () => {
    const input = baseInput({
      general: [{ kind: "member", membershipId: "gen1", name: "Gen" }],
      availabilityByMembership: new Map([
        ["gen1", availability({ "2026-07-01": { am: "unavailable", pm: "unavailable" } })],
      ]),
    });
    const results = rankCandidates(input);
    expect(results.some((r) => r.startDateIso === "2026-07-01")).toBe(true);
  });

  it("ranks a date with a Best required person above one with an OK required person", () => {
    const input = baseInput({
      searchStart: utcDate(2026, 6, 1),
      searchEnd: utcDate(2026, 6, 2),
      required: [{ kind: "member", membershipId: "req1", name: "Req" }],
      availabilityByMembership: new Map([
        [
          "req1",
          availability({
            "2026-07-01": { am: "best", pm: "best" },
            "2026-07-02": { am: "ok", pm: "ok" },
          }),
        ],
      ]),
    });
    const results = rankCandidates(input);
    expect(results[0].startDateIso).toBe("2026-07-01");
  });

  it("excludes placeholder slots from availability computation but includes them in the breakdown", () => {
    const input = baseInput({
      searchStart: utcDate(2026, 6, 1),
      searchEnd: utcDate(2026, 6, 1),
      required: [{ kind: "placeholder", label: "TBD Boom Op" }],
    });
    const results = rankCandidates(input);
    expect(results).toHaveLength(1);
    expect(results[0].breakdown[0]).toEqual({
      slot: { kind: "placeholder", label: "TBD Boom Op" },
      role: "required",
      tier: null,
    });
  });

  it("treats unknown availability as a light penalty, not a disqualifier", () => {
    const input = baseInput({
      searchStart: utcDate(2026, 6, 1),
      searchEnd: utcDate(2026, 6, 1),
      required: [{ kind: "member", membershipId: "req1", name: "Req" }],
      availabilityByMembership: new Map(),
    });
    const results = rankCandidates(input);
    expect(results).toHaveLength(1);
    expect(results[0].score).toBeGreaterThan(0);
  });
});
