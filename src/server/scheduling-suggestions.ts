// Pure date-ranking logic (spec §4.5, pivoted to timed soft/hard blocks in
// issue #70/#71), shared by shoot and meeting planning — nothing in here is
// shoot- or meeting-specific. Kept free of Prisma/DB calls so the hard-gate
// and worst-day rules are unit-testable without a database — see
// scheduling-suggestions.test.ts.

import { toIsoDate } from "@/server/availability-rules";
import { formatTimeRange, timeRangesOverlap } from "@/lib/time";
import type { BlockType } from "@/lib/availability-blocks";

export type DayWindow = { startTime: string; endTime: string };

export type AvailabilityBlockRef = { startTime: string; endTime: string; blockType: BlockType; label: string | null };

export type PersonAvailability = Map<string, AvailabilityBlockRef[]>; // dateIso -> blocks

export type CrewMember = { membershipId: string; name: string };

export type CandidateSlot =
  | { kind: "member"; membershipId: string; name: string }
  | { kind: "placeholder"; label: string };

export type CandidateInput = {
  required: CandidateSlot[];
  general: CandidateSlot[];
  numDays: number;
  dayWindow: DayWindow; // the shoot/meeting's start/estimated-end time, applied to every day of the candidate block
  searchStart: Date;
  searchEnd: Date;
  availabilityByMembership: Map<string, PersonAvailability>;
};

/** "clear" = no overlapping block. "flagged" = a soft block overlaps (never disqualifies). "hard" = a hard block overlaps (disqualifies a required person). */
export type DayStatus = "clear" | "flagged" | "hard";

const STATUS_VALUE: Record<DayStatus, number> = { clear: 1, flagged: 0.6, hard: 0 };

/** The single block responsible for a day's status — worst-severity match, used for the conflict note. */
function overlappingBlock(blocks: AvailabilityBlockRef[], window: DayWindow, blockType: BlockType) {
  return blocks.find(
    (b) => b.blockType === blockType && timeRangesOverlap(window.startTime, window.endTime, b.startTime, b.endTime),
  );
}

export function dayStatus(blocks: AvailabilityBlockRef[], window: DayWindow): DayStatus {
  if (overlappingBlock(blocks, window, "hard")) return "hard";
  if (overlappingBlock(blocks, window, "soft")) return "flagged";
  return "clear";
}

export function conflictLabelFor(blocks: AvailabilityBlockRef[], window: DayWindow, status: DayStatus): string | null {
  if (status === "clear") return null;
  const block = overlappingBlock(blocks, window, status === "hard" ? "hard" : "soft");
  if (!block) return null;
  const timeLabel = formatTimeRange(block.startTime, block.endTime);
  return block.label ? `${block.label}, ${timeLabel}` : timeLabel;
}

export type PersonBreakdown = {
  slot: CandidateSlot;
  role: "required" | "general";
  status: DayStatus | null; // worst-day status across the candidate block, null for placeholders
  conflictLabel: string | null; // human-readable detail for the worst flagged/hard day, e.g. "Waitressing shift, 7:00 PM–11:00 PM"
};

/** Coarse bucket shown to the user above the continuous score — see tierFor(). */
export type SuggestionTier = "best" | "good" | "possible";

export type RankedCandidate = {
  startDateIso: string;
  dayIsos: string[];
  score: number;
  tier: SuggestionTier;
  hasConflict: boolean; // true when a required person has a soft-block conflict on any day — sorts after fully-free candidates, never disqualifies
  availableCount: number;
  totalCount: number;
  breakdown: PersonBreakdown[];
};

const TIER_ORDER: Record<SuggestionTier, number> = { best: 0, good: 1, possible: 2 };

/**
 * Buckets the continuous score into the three tiers shown in the UI.
 * "best" requires a perfect score (no required-person conflict and no
 * general-crew hard blocks); "good" and "possible" split the rest at a
 * threshold below which most of the crew is unavailable.
 */
export function tierFor(score: number): SuggestionTier {
  if (score >= 1) return "best";
  if (score >= 0.7) return "good";
  return "possible";
}

function candidateDayIsos(startDate: Date, numDays: number) {
  const isos: string[] = [];
  for (let i = 0; i < numDays; i++) {
    isos.push(toIsoDate(new Date(startDate.getTime() + i * 86_400_000)));
  }
  return isos;
}

/** Worse-status-wins across a multi-day candidate block, mirroring the old worst-day rule. */
function worstStatus(statuses: DayStatus[]): DayStatus {
  return statuses.reduce((worst, s) => (STATUS_VALUE[s] < STATUS_VALUE[worst] ? s : worst), statuses[0]);
}

/** Evaluates one candidate block, or returns null if a required slot disqualifies it. */
function evaluateCandidate(
  startDate: Date,
  dayIsos: string[],
  input: CandidateInput,
): RankedCandidate | null {
  const breakdown: PersonBreakdown[] = [];

  const requiredValuesPerPerson: number[] = [];
  for (const slot of input.required) {
    if (slot.kind === "placeholder") {
      breakdown.push({ slot, role: "required", status: null, conflictLabel: null });
      continue;
    }
    const availability = input.availabilityByMembership.get(slot.membershipId);
    const dayStatuses = dayIsos.map((dateIso) => dayStatus(availability?.get(dateIso) ?? [], input.dayWindow));

    // Hard gate: a required (real) person with a hard block overlapping the
    // window on ANY day disqualifies the whole candidate, no exceptions
    // (issue #8 acceptance criteria, unchanged in spirit for #71).
    if (dayStatuses.some((s) => s === "hard")) return null;

    const worst = worstStatus(dayStatuses);
    const worstDayIndex = dayStatuses.findIndex((s) => s === worst);
    const conflictLabel = conflictLabelFor(
      availability?.get(dayIsos[worstDayIndex]) ?? [],
      input.dayWindow,
      worst,
    );

    breakdown.push({ slot, role: "required", status: worst, conflictLabel });
    requiredValuesPerPerson.push(
      dayStatuses.reduce((sum, s) => sum + STATUS_VALUE[s], 0) / dayStatuses.length,
    );
  }

  const generalAvailableRatiosPerDay: number[] = dayIsos.map(() => 0);
  let generalRealCount = 0;
  for (const slot of input.general) {
    if (slot.kind === "placeholder") {
      breakdown.push({ slot, role: "general", status: null, conflictLabel: null });
      continue;
    }
    generalRealCount++;
    const availability = input.availabilityByMembership.get(slot.membershipId);
    const dayStatuses = dayIsos.map((dateIso) => dayStatus(availability?.get(dateIso) ?? [], input.dayWindow));
    dayStatuses.forEach((s, i) => {
      if (s !== "hard") generalAvailableRatiosPerDay[i] += 1;
    });

    const worst = worstStatus(dayStatuses);
    const worstDayIndex = dayStatuses.findIndex((s) => s === worst);
    const conflictLabel = conflictLabelFor(
      availability?.get(dayIsos[worstDayIndex]) ?? [],
      input.dayWindow,
      worst,
    );
    breakdown.push({ slot, role: "general", status: worst, conflictLabel });
  }

  // Score: required people's average status value across days, plus general
  // crew's "not hard-blocked" ratio, averaged across days.
  const requiredComponent =
    requiredValuesPerPerson.length === 0
      ? 1
      : requiredValuesPerPerson.reduce((a, b) => a + b, 0) / requiredValuesPerPerson.length;

  const generalComponent =
    generalRealCount === 0
      ? 1
      : generalAvailableRatiosPerDay.reduce((sum, count) => sum + count / generalRealCount, 0) /
        generalAvailableRatiosPerDay.length;

  const score = requiredComponent * 0.6 + generalComponent * 0.4;

  // A required person flagged (soft-block conflict) on their worst day marks
  // the whole candidate as "has a conflict" — never disqualifies, but sorts
  // after fully-free candidates (issue #71: "show fully-free dates first,
  // and flag them").
  const hasConflict = breakdown.some((b) => b.role === "required" && b.status === "flagged");

  // Display ratio: how many of the real people (required + general) are
  // clear/flagged (i.e. not hard-blocked) on their worst day — an intuitive
  // "8/10", separate from the underlying weighted score used to sort candidates.
  const realPeople = breakdown.filter((b) => b.status !== null);
  const availableCount = realPeople.filter((b) => b.status !== "hard").length;

  return {
    startDateIso: toIsoDate(startDate),
    dayIsos,
    score,
    tier: tierFor(score),
    hasConflict,
    availableCount,
    totalCount: realPeople.length,
    breakdown,
  };
}

/** Ranks every candidate start-date within the search window: best tier first, then chronologically within each tier. */
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

  return candidates.sort(
    (a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.startDateIso.localeCompare(b.startDateIso),
  );
}
