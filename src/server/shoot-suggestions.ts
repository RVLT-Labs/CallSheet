// Pure shoot-date ranking logic (spec §4.5). Kept free of Prisma/DB calls so
// the hard-gate and worst-day rules are unit-testable without a database —
// see shoot-suggestions.test.ts.

import { toIsoDate } from "@/server/availability-rules";
import type { Tier } from "@/lib/availability-tiers";

export type HalfDayPreference = "AM" | "PM" | "EITHER";

export type PersonAvailability = Map<string, { am: Tier | null; pm: Tier | null }>; // dateIso -> tiers

export type CrewMember = { membershipId: string; name: string };

export type CandidateSlot =
  | { kind: "member"; membershipId: string; name: string }
  | { kind: "placeholder"; label: string };

export type CandidateInput = {
  required: CandidateSlot[];
  general: CandidateSlot[];
  numDays: number;
  halfDayPreference: HalfDayPreference;
  searchStart: Date;
  searchEnd: Date;
  availabilityByMembership: Map<string, PersonAvailability>;
};

export type PersonBreakdown = {
  slot: CandidateSlot;
  role: "required" | "general";
  tier: Tier | null; // combined day tier on the candidate's worst day, null for placeholders
};

export type RankedCandidate = {
  startDateIso: string;
  dayIsos: string[];
  score: number;
  availableCount: number;
  totalCount: number;
  breakdown: PersonBreakdown[];
};

const TIER_VALUE: Record<Tier, number> = { best: 1, ok: 0.6, unavailable: 0 };
const UNKNOWN_VALUE = 0.4; // "light penalty, never a red flag" (issue #8 scope)

/**
 * Combines a day's AM/PM tiers into a single day-level tier per the chosen
 * half-day preference. For "EITHER" (a full working day), the day is only as
 * good as its worse half — the same worst-of philosophy the issue applies to
 * multi-day candidates, at the half-day level.
 */
export function combineDayTier(
  am: Tier | null,
  pm: Tier | null,
  preference: HalfDayPreference,
): Tier | null {
  if (preference === "AM") return am;
  if (preference === "PM") return pm;

  if (am === "unavailable" || pm === "unavailable") return "unavailable";
  if (am === null && pm === null) return null;
  if (am === "best" && pm === "best") return "best";
  if (am === null) return pm;
  if (pm === null) return am;
  return "ok";
}

function dayValue(tier: Tier | null) {
  return tier === null ? UNKNOWN_VALUE : TIER_VALUE[tier];
}

function candidateDayIsos(startDate: Date, numDays: number) {
  const isos: string[] = [];
  for (let i = 0; i < numDays; i++) {
    isos.push(toIsoDate(new Date(startDate.getTime() + i * 86_400_000)));
  }
  return isos;
}

/** Evaluates one candidate block, or returns null if a required slot disqualifies it. */
function evaluateCandidate(
  startDate: Date,
  dayIsos: string[],
  input: CandidateInput,
): RankedCandidate | null {
  const breakdown: PersonBreakdown[] = [];

  const requiredTiersPerDay: number[][] = []; // [personIndex][dayIndex]
  for (const slot of input.required) {
    if (slot.kind === "placeholder") {
      breakdown.push({ slot, role: "required", tier: null });
      continue;
    }
    const availability = input.availabilityByMembership.get(slot.membershipId);
    const dayTiers = dayIsos.map((dateIso) => {
      const day = availability?.get(dateIso);
      return combineDayTier(day?.am ?? null, day?.pm ?? null, input.halfDayPreference);
    });

    // Hard gate: a required (real) person Unavailable on ANY day disqualifies
    // the whole candidate, no exceptions (issue #8 acceptance criteria).
    if (dayTiers.some((t) => t === "unavailable")) return null;

    // Worst-day rule for the displayed/scored tier — a multi-day shoot is
    // only as good as its worst day for a required person.
    const worstTier = dayTiers.reduce<Tier | null>((worst, t) => {
      if (dayValue(t) < dayValue(worst)) return t;
      return worst;
    }, dayTiers[0]);

    breakdown.push({ slot, role: "required", tier: worstTier });
    requiredTiersPerDay.push(dayTiers.map(dayValue));
  }

  const generalRatiosPerDay: number[] = dayIsos.map(() => 0);
  let generalRealCount = 0;
  for (const slot of input.general) {
    if (slot.kind === "placeholder") {
      breakdown.push({ slot, role: "general", tier: null });
      continue;
    }
    generalRealCount++;
    const availability = input.availabilityByMembership.get(slot.membershipId);
    const dayTiers = dayIsos.map((dateIso) => {
      const day = availability?.get(dateIso);
      return combineDayTier(day?.am ?? null, day?.pm ?? null, input.halfDayPreference);
    });
    dayTiers.forEach((t, i) => {
      if (t === "best" || t === "ok") generalRatiosPerDay[i] += 1;
    });

    const worstTier = dayTiers.reduce<Tier | null>((worst, t) => {
      if (dayValue(t) < dayValue(worst)) return t;
      return worst;
    }, dayTiers[0]);
    breakdown.push({ slot, role: "general", tier: worstTier });
  }

  // Score: required people's average tier value across days, plus general
  // crew's "available" ratio (Best+OK / total), averaged across days.
  const requiredComponent =
    requiredTiersPerDay.length === 0
      ? 1
      : requiredTiersPerDay.reduce((sum, dayValues) => sum + dayValues.reduce((a, b) => a + b, 0) / dayValues.length, 0) /
        requiredTiersPerDay.length;

  const generalComponent =
    generalRealCount === 0
      ? 1
      : generalRatiosPerDay.reduce((sum, count) => sum + count / generalRealCount, 0) / generalRatiosPerDay.length;

  const score = requiredComponent * 0.6 + generalComponent * 0.4;

  // Display ratio: how many of the real people (required + general) are
  // Best/OK on every day of the block — an intuitive "8/10", separate from
  // the underlying weighted score used to sort candidates.
  const realPeople = breakdown.filter((b) => b.tier !== null);
  const availableCount = realPeople.filter((b) => b.tier === "best" || b.tier === "ok").length;

  return {
    startDateIso: toIsoDate(startDate),
    dayIsos,
    score,
    availableCount,
    totalCount: realPeople.length,
    breakdown,
  };
}

/** Ranks every candidate start-date within the search window, best first. */
export function rankCandidates(input: CandidateInput): RankedCandidate[] {
  const candidates: RankedCandidate[] = [];
  const lastPossibleStart = new Date(input.searchEnd.getTime() - (input.numDays - 1) * 86_400_000);

  for (
    let start = new Date(input.searchStart);
    start <= lastPossibleStart;
    start = new Date(start.getTime() + 86_400_000)
  ) {
    const dayIsos = candidateDayIsos(start, input.numDays);
    const result = evaluateCandidate(start, dayIsos, input);
    if (result) candidates.push(result);
  }

  return candidates.sort((a, b) => b.score - a.score || a.startDateIso.localeCompare(b.startDateIso));
}
