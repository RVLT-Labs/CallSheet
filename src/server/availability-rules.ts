// Pure recurring-rule resolution logic (spec §4.3, §10, pivoted to timed
// soft/hard blocks in issue #70/#71). Kept free of Prisma/DB calls so the
// manual-overrides-recurring precedence rule is unit-testable without a
// database — see availability-rules.test.ts.

import type { BlockType } from "@/lib/availability-blocks";

export type RecurringRule = {
  id: string;
  dayOfWeek: number; // 0 (Sunday) - 6 (Saturday)
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  blockType: BlockType;
  label: string | null;
  effectiveStart: Date;
  effectiveEnd: Date | null;
};

export type ManualEntry = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  blockType: BlockType;
  label: string | null;
};

export type ResolvedBlock = {
  id: string | null; // the underlying Availability row id for a manual block; null for a not-yet-materialized recurring block
  date: Date;
  startTime: string;
  endTime: string;
  blockType: BlockType;
  label: string | null;
  source: "manual" | "recurring";
  ruleId: string | null;
  ruleLabel: string | null;
};

function isSameUtcDay(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function ruleAppliesToDate(rule: RecurringRule, date: Date) {
  if (date.getUTCDay() !== rule.dayOfWeek) return false;
  if (date < rule.effectiveStart && !isSameUtcDay(date, rule.effectiveStart)) return false;
  if (rule.effectiveEnd && date > rule.effectiveEnd && !isSameUtcDay(date, rule.effectiveEnd)) return false;
  return true;
}

/** Every rule that generates a block on this date. Unlike the old tier model, more than one can legitimately apply. */
export function resolveRulesForDate(rules: RecurringRule[], date: Date): RecurringRule[] {
  return rules.filter((rule) => ruleAppliesToDate(rule, date));
}

/**
 * Resolves every block in [windowStart, windowEnd] (inclusive, UTC dates) for
 * one membership. A date with any manual block suppresses recurring
 * generation for that date entirely — manual always wins (spec §10). A date
 * in `overrideDates` with zero manual blocks is a date the crew member
 * explicitly cleared to fully free, so recurring is suppressed there too
 * (see AvailabilityDateOverride). A date with neither is either fully free
 * (no rule matches) or governed by whichever recurring rules match it.
 */
export function resolveAvailabilityWindow(
  rules: RecurringRule[],
  manualEntries: ManualEntry[],
  overrideDates: Set<string>,
  windowStart: Date,
  windowEnd: Date,
): ResolvedBlock[] {
  const manualByDate = new Map<string, ManualEntry[]>();
  for (const entry of manualEntries) {
    const key = toIsoDate(entry.date);
    const list = manualByDate.get(key) ?? [];
    list.push(entry);
    manualByDate.set(key, list);
  }

  const resolved: ResolvedBlock[] = [];

  for (
    let date = new Date(windowStart);
    date <= windowEnd;
    date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1))
  ) {
    const key = toIsoDate(date);
    const manual = manualByDate.get(key);

    if (manual && manual.length > 0) {
      for (const entry of manual) {
        resolved.push({
          id: entry.id,
          date,
          startTime: entry.startTime,
          endTime: entry.endTime,
          blockType: entry.blockType,
          label: entry.label,
          source: "manual",
          ruleId: null,
          ruleLabel: null,
        });
      }
      continue;
    }

    if (overrideDates.has(key)) continue;

    for (const rule of resolveRulesForDate(rules, date)) {
      resolved.push({
        id: null,
        date,
        startTime: rule.startTime,
        endTime: rule.endTime,
        blockType: rule.blockType,
        label: rule.label,
        source: "recurring",
        ruleId: rule.id,
        ruleLabel: rule.label,
      });
    }
  }

  return resolved;
}

export function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day));
}

export function parseIsoDateUtc(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return utcDate(year, month - 1, day);
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
