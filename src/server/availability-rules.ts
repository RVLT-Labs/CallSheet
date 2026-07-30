// Pure recurring-rule resolution logic (spec §4.3, §10). Kept free of Prisma/DB
// calls so the manual-overrides-recurring precedence rule is unit-testable
// without a database — see availability-rules.test.ts.

export type HalfDay = "AM" | "PM";
export type AvailabilityTier = "best" | "ok" | "unavailable";

export type RecurringRule = {
  id: string;
  dayOfWeek: number; // 0 (Sunday) - 6 (Saturday)
  halfDay: HalfDay | null; // null = both AM and PM
  tier: AvailabilityTier;
  label: string | null;
  effectiveStart: Date;
  effectiveEnd: Date | null;
  createdAt: Date;
};

export type ManualEntry = {
  date: Date;
  halfDay: HalfDay;
  tier: AvailabilityTier;
};

export type ResolvedHalfDay = {
  date: Date;
  halfDay: HalfDay;
  tier: AvailabilityTier;
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

function ruleAppliesToDate(rule: RecurringRule, date: Date, halfDay: HalfDay) {
  if (rule.halfDay !== null && rule.halfDay !== halfDay) return false;
  if (date.getUTCDay() !== rule.dayOfWeek) return false;
  if (date < rule.effectiveStart && !isSameUtcDay(date, rule.effectiveStart)) return false;
  if (rule.effectiveEnd && date > rule.effectiveEnd && !isSameUtcDay(date, rule.effectiveEnd)) return false;
  return true;
}

/**
 * The rule that would generate this date/half-day's availability, or null if
 * none applies. When more than one rule matches the same date/half-day, the
 * most recently created rule wins (documented tie-break — the spec doesn't
 * define one for genuinely overlapping rules).
 */
export function resolveRuleForDate(
  rules: RecurringRule[],
  date: Date,
  halfDay: HalfDay,
): RecurringRule | null {
  let winner: RecurringRule | null = null;
  for (const rule of rules) {
    if (!ruleAppliesToDate(rule, date, halfDay)) continue;
    if (!winner || rule.createdAt > winner.createdAt) winner = rule;
  }
  return winner;
}

/**
 * Resolves every half-day in [windowStart, windowEnd] (inclusive, UTC dates)
 * for one membership. A manual entry always wins over a matching rule,
 * regardless of which was set first (spec §10). Half-days with neither a
 * manual entry nor a matching rule are omitted — "unknown" is the absence of
 * a row, distinct from an explicit "unavailable".
 */
export function resolveAvailabilityWindow(
  rules: RecurringRule[],
  manualEntries: ManualEntry[],
  windowStart: Date,
  windowEnd: Date,
): ResolvedHalfDay[] {
  const manualByKey = new Map<string, ManualEntry>();
  for (const entry of manualEntries) {
    manualByKey.set(`${entry.date.toISOString().slice(0, 10)}-${entry.halfDay}`, entry);
  }

  const resolved: ResolvedHalfDay[] = [];
  const halfDays: HalfDay[] = ["AM", "PM"];

  for (
    let date = new Date(windowStart);
    date <= windowEnd;
    date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1))
  ) {
    for (const halfDay of halfDays) {
      const key = `${date.toISOString().slice(0, 10)}-${halfDay}`;
      const manual = manualByKey.get(key);
      if (manual) {
        resolved.push({ date, halfDay, tier: manual.tier, source: "manual", ruleId: null, ruleLabel: null });
        continue;
      }

      const rule = resolveRuleForDate(rules, date, halfDay);
      if (rule) {
        resolved.push({
          date,
          halfDay,
          tier: rule.tier,
          source: "recurring",
          ruleId: rule.id,
          ruleLabel: rule.label,
        });
      }
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
