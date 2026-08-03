import { describe, expect, it } from "vitest";

import {
  dayStatus,
  rankCandidates,
  tierFor,
  type AvailabilityBlockRef,
  type CandidateInput,
  type PersonAvailability,
} from "@/server/scheduling-suggestions";
import { utcDate } from "@/server/availability-rules";

function block(overrides: Partial<AvailabilityBlockRef> = {}): AvailabilityBlockRef {
  return { startTime: "09:00", endTime: "17:00", blockType: "hard", label: null, ...overrides };
}

function availability(entries: Record<string, AvailabilityBlockRef[]>): PersonAvailability {
  return new Map(Object.entries(entries));
}

function baseInput(overrides: Partial<CandidateInput> = {}): CandidateInput {
  return {
    required: [],
    general: [],
    numDays: 1,
    dayWindow: { startTime: "09:00", endTime: "17:00" },
    searchStart: utcDate(2026, 6, 1),
    searchEnd: utcDate(2026, 6, 7),
    availabilityByMembership: new Map(),
    ...overrides,
  };
}

describe("dayStatus", () => {
  it("is clear when no block overlaps the window", () => {
    expect(dayStatus([block({ startTime: "18:00", endTime: "20:00" })], { startTime: "09:00", endTime: "17:00" })).toBe(
      "clear",
    );
  });

  it("is hard when a hard block overlaps the window", () => {
    expect(dayStatus([block({ blockType: "hard" })], { startTime: "09:00", endTime: "17:00" })).toBe("hard");
  });

  it("is flagged (never hard) when only a soft block overlaps the window", () => {
    expect(dayStatus([block({ blockType: "soft" })], { startTime: "09:00", endTime: "17:00" })).toBe("flagged");
  });
});

describe("rankCandidates", () => {
  it("never suggests a date where a required (real) person has a hard block overlapping the window", () => {
    const input = baseInput({
      required: [{ kind: "member", membershipId: "req1", name: "Req" }],
      availabilityByMembership: new Map([
        ["req1", availability({ "2026-07-01": [block({ blockType: "hard" })] })],
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
            "2026-07-01": [],
            "2026-07-02": [block({ blockType: "hard" })],
          }),
        ],
      ]),
    });
    const results = rankCandidates(input);
    expect(results.some((r) => r.startDateIso === "2026-07-01")).toBe(false);
  });

  it("never disqualifies a candidate based on general crew's hard block", () => {
    const input = baseInput({
      general: [{ kind: "member", membershipId: "gen1", name: "Gen" }],
      availabilityByMembership: new Map([
        ["gen1", availability({ "2026-07-01": [block({ blockType: "hard" })] })],
      ]),
    });
    const results = rankCandidates(input);
    expect(results.some((r) => r.startDateIso === "2026-07-01")).toBe(true);
  });

  it("a soft block on a required person never disqualifies, but flags the candidate and sorts it after fully-free dates", () => {
    const input = baseInput({
      searchStart: utcDate(2026, 6, 1),
      searchEnd: utcDate(2026, 6, 2),
      required: [{ kind: "member", membershipId: "req1", name: "Req" }],
      availabilityByMembership: new Map([
        [
          "req1",
          availability({
            "2026-07-01": [block({ blockType: "soft", label: "Waitressing shift" })],
            "2026-07-02": [],
          }),
        ],
      ]),
    });
    const results = rankCandidates(input);
    expect(results).toHaveLength(2);
    // Fully-free 07-02 sorts before flagged 07-01, even though it's later.
    expect(results[0].startDateIso).toBe("2026-07-02");
    expect(results[0].hasConflict).toBe(false);
    expect(results[1].startDateIso).toBe("2026-07-01");
    expect(results[1].hasConflict).toBe(true);
    expect(results[1].breakdown[0].conflictLabel).toContain("Waitressing shift");
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
      status: null,
      conflictLabel: null,
    });
  });

  it("treats a person with no availability data as fully available (default-available model)", () => {
    const input = baseInput({
      searchStart: utcDate(2026, 6, 1),
      searchEnd: utcDate(2026, 6, 1),
      required: [{ kind: "member", membershipId: "req1", name: "Req" }],
      availabilityByMembership: new Map(),
    });
    const results = rankCandidates(input);
    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(1);
    expect(results[0].tier).toBe("best");
    expect(results[0].breakdown[0].status).toBe("clear");
  });

  it("groups candidates into best/good/possible tiers and sorts by date within each tier", () => {
    const input = baseInput({
      searchStart: utcDate(2026, 7, 1),
      searchEnd: utcDate(2026, 7, 4),
      required: [{ kind: "member", membershipId: "req1", name: "Req" }],
      general: [
        { kind: "member", membershipId: "gen1", name: "Gen1" },
        { kind: "member", membershipId: "gen2", name: "Gen2" },
        { kind: "member", membershipId: "gen3", name: "Gen3" },
        { kind: "member", membershipId: "gen4", name: "Gen4" },
      ],
      availabilityByMembership: new Map([
        // 08-04: fully clear for everyone -> best.
        // 08-01: required has a soft-block conflict, general fully clear -> good.
        ["req1", availability({ "2026-08-01": [block({ blockType: "soft" })] })],
        // 08-02: required clear, but the whole general crew is hard-blocked -> possible.
        ["gen1", availability({ "2026-08-02": [block({ blockType: "hard" })] })],
        ["gen2", availability({ "2026-08-02": [block({ blockType: "hard" })] })],
        ["gen3", availability({ "2026-08-02": [block({ blockType: "hard" })] })],
        ["gen4", availability({ "2026-08-02": [block({ blockType: "hard" })] })],
      ]),
    });
    const results = rankCandidates(input);
    const byDate = new Map(results.map((r) => [r.startDateIso, r]));

    expect(byDate.get("2026-08-04")?.tier).toBe("best");
    expect(byDate.get("2026-08-01")?.tier).toBe("good");
    expect(byDate.get("2026-08-02")?.tier).toBe("possible");

    // Tier order first (best, good, possible), chronological within each tier.
    // 08-03 has no availability data for anyone, so it's fully clear too (best), and sorts before 08-04.
    expect(results.map((r) => r.startDateIso)).toEqual(["2026-08-03", "2026-08-04", "2026-08-01", "2026-08-02"]);
  });
});

describe("tierFor", () => {
  it("is best only for a perfect score", () => {
    expect(tierFor(1)).toBe("best");
    expect(tierFor(0.99)).toBe("good");
  });

  it("is good from 0.7 up to (not including) a perfect score", () => {
    expect(tierFor(0.7)).toBe("good");
    expect(tierFor(0.85)).toBe("good");
  });

  it("is possible below 0.7", () => {
    expect(tierFor(0.69)).toBe("possible");
    expect(tierFor(0)).toBe("possible");
  });
});
