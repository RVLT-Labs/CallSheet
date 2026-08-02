import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Tier } from "@/lib/availability-tiers";
import {
  parseIsoDateUtc,
  resolveAvailabilityWindow,
  toIsoDate,
  type HalfDay,
  type ManualEntry,
  type RecurringRule,
} from "@/server/availability-rules";

export async function requireActiveMembership() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) throw new Error("No active film");

  const membership = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId, userId: session.user.id } },
  });
  if (!membership) throw new Error("Not a crew member of this film");

  const film = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });

  return { session, membershipId: membership.id, organizationId, film };
}

type ExistingAvailabilityRow = Awaited<ReturnType<typeof prisma.availability.findMany>>[number];
type UpsertRow = { date: Date; halfDay: HalfDay; tier: Tier; sourceRuleId: string | null };

/**
 * Pure diff between a membership's recurring rules and its currently-stored
 * Availability rows: which recurring rows are now stale (rule no longer
 * applies) and which need upserting (rule is new or changed), plus the fully
 * resolved window (manual entries always win — spec §10). Shared by the
 * single-membership and batched persist paths below so they can't drift.
 */
function diffAvailabilityWindow(
  rules: RecurringRule[],
  existing: ExistingAvailabilityRow[],
  windowStart: Date,
  windowEnd: Date,
) {
  const manualEntries: ManualEntry[] = existing
    .filter((row) => row.source === "manual")
    .map((row) => ({ date: row.date, halfDay: row.halfDay, tier: row.tier }));

  const resolved = resolveAvailabilityWindow(rules, manualEntries, windowStart, windowEnd);

  const resolvedRecurring = resolved.filter((r) => r.source === "recurring");
  const resolvedKeys = new Set(resolvedRecurring.map((r) => `${toIsoDate(r.date)}-${r.halfDay}`));

  const staleRecurringIds = existing
    .filter((row) => row.source === "recurring" && !resolvedKeys.has(`${toIsoDate(row.date)}-${row.halfDay}`))
    .map((row) => row.id);

  const existingByKey = new Map(existing.map((row) => [`${toIsoDate(row.date)}-${row.halfDay}`, row]));

  const upserts: UpsertRow[] = resolvedRecurring
    .filter((r) => {
      const current = existingByKey.get(`${toIsoDate(r.date)}-${r.halfDay}`);
      return !current || current.tier !== r.tier || current.source !== "recurring" || current.sourceRuleId !== r.ruleId;
    })
    .map((r) => ({ date: r.date, halfDay: r.halfDay, tier: r.tier, sourceRuleId: r.ruleId }));

  return { resolved, staleRecurringIds, upserts };
}

/**
 * Re-materializes recurring-rule-derived Availability rows for a membership
 * across a window (bounded by the film's working date range — spec §4.3).
 * Manual rows are never touched. Recurring rows are upserted where a rule now
 * applies and deleted where a rule no longer applies (e.g. after an edit or
 * delete), so a read of the Availability table alone is always the resolved
 * view — downstream epics (aggregate grid #7, suggestion algorithm #8) don't
 * need to re-derive precedence themselves.
 *
 * Returns the resolved window and rules it just computed so callers (see
 * getAvailabilityCalendarData) can build the calendar view straight from
 * memory instead of re-querying the rows this just wrote.
 */
export async function resolveAndPersistAvailabilityWindow(
  membershipId: string,
  windowStart: Date,
  windowEnd: Date,
) {
  const [rules, existing] = await Promise.all([
    prisma.recurringAvailabilityRule.findMany({
      where: { membershipId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.availability.findMany({
      where: { membershipId, date: { gte: windowStart, lte: windowEnd } },
    }),
  ]);

  const { resolved, staleRecurringIds, upserts } = diffAvailabilityWindow(
    rules as RecurringRule[],
    existing,
    windowStart,
    windowEnd,
  );

  if (staleRecurringIds.length || upserts.length) {
    await prisma.$transaction([
      ...(staleRecurringIds.length
        ? [prisma.availability.deleteMany({ where: { id: { in: staleRecurringIds } } })]
        : []),
      ...upserts.map((r) =>
        prisma.availability.upsert({
          where: { membershipId_date_halfDay: { membershipId, date: r.date, halfDay: r.halfDay } },
          create: {
            membershipId,
            date: r.date,
            halfDay: r.halfDay,
            tier: r.tier,
            source: "recurring",
            sourceRuleId: r.sourceRuleId,
          },
          update: { tier: r.tier, source: "recurring", sourceRuleId: r.sourceRuleId },
        }),
      ),
    ]);
  }

  return { resolved, rules };
}

export type DayCell = {
  dateIso: string;
  am: { tier: Tier; source: "manual" | "recurring"; ruleLabel: string | null } | null;
  pm: { tier: Tier; source: "manual" | "recurring"; ruleLabel: string | null } | null;
};

function toDays(resolved: ReturnType<typeof resolveAvailabilityWindow>): DayCell[] {
  const byDate = new Map<string, DayCell>();

  for (const entry of resolved) {
    const dateIso = toIsoDate(entry.date);
    const cell = byDate.get(dateIso) ?? { dateIso, am: null, pm: null };
    const dayEntry = { tier: entry.tier as Tier, source: entry.source, ruleLabel: entry.ruleLabel };
    if (entry.halfDay === "AM") cell.am = dayEntry;
    else cell.pm = dayEntry;
    byDate.set(dateIso, cell);
  }

  return [...byDate.values()];
}

export async function getAvailabilityCalendarData(membershipId: string, windowStart: Date, windowEnd: Date) {
  const { resolved, rules } = await resolveAndPersistAvailabilityWindow(membershipId, windowStart, windowEnd);
  const ruleById = new Map(rules.map((r) => [r.id, r]));
  return { days: toDays(resolved), rules, ruleById };
}

type RecurringRuleRow = Awaited<ReturnType<typeof prisma.recurringAvailabilityRule.findMany>>[number];
type CalendarData = { days: DayCell[]; rules: RecurringRuleRow[]; ruleById: Map<string, RecurringRuleRow> };

/**
 * Batched form of getAvailabilityCalendarData for call sites that need many
 * crew members' calendars at once (the aggregate grid, tentative-shoot/meeting
 * availability ratios, date-suggestion ranking). Fetches rules and existing
 * rows for every membershipId with two IN-clause queries instead of two per
 * person, and persists any recurring-rule drift for the whole batch in a
 * single transaction — turning an O(N) round-trip fan-out into O(1).
 */
export async function getAvailabilityCalendarDataBatch(
  membershipIds: string[],
  windowStart: Date,
  windowEnd: Date,
): Promise<Map<string, CalendarData>> {
  const result = new Map<string, CalendarData>();

  const uniqueIds = [...new Set(membershipIds)];
  if (uniqueIds.length === 0) return result;

  const [allRules, allExisting] = await Promise.all([
    prisma.recurringAvailabilityRule.findMany({
      where: { membershipId: { in: uniqueIds } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.availability.findMany({
      where: { membershipId: { in: uniqueIds }, date: { gte: windowStart, lte: windowEnd } },
    }),
  ]);

  const rulesByMembership = new Map<string, typeof allRules>();
  for (const rule of allRules) {
    const list = rulesByMembership.get(rule.membershipId) ?? [];
    list.push(rule);
    rulesByMembership.set(rule.membershipId, list);
  }

  const existingByMembership = new Map<string, typeof allExisting>();
  for (const row of allExisting) {
    const list = existingByMembership.get(row.membershipId) ?? [];
    list.push(row);
    existingByMembership.set(row.membershipId, list);
  }

  const deleteIds: string[] = [];
  const upserts: (UpsertRow & { membershipId: string })[] = [];

  for (const membershipId of uniqueIds) {
    const rules = rulesByMembership.get(membershipId) ?? [];
    const existing = existingByMembership.get(membershipId) ?? [];

    const diff = diffAvailabilityWindow(rules as RecurringRule[], existing, windowStart, windowEnd);
    deleteIds.push(...diff.staleRecurringIds);
    upserts.push(...diff.upserts.map((u) => ({ ...u, membershipId })));

    const ruleById = new Map(rules.map((r) => [r.id, r]));
    result.set(membershipId, { days: toDays(diff.resolved), rules, ruleById });
  }

  if (deleteIds.length || upserts.length) {
    await prisma.$transaction([
      ...(deleteIds.length ? [prisma.availability.deleteMany({ where: { id: { in: deleteIds } } })] : []),
      ...upserts.map((u) =>
        prisma.availability.upsert({
          where: { membershipId_date_halfDay: { membershipId: u.membershipId, date: u.date, halfDay: u.halfDay } },
          create: {
            membershipId: u.membershipId,
            date: u.date,
            halfDay: u.halfDay,
            tier: u.tier,
            source: "recurring",
            sourceRuleId: u.sourceRuleId,
          },
          update: { tier: u.tier, source: "recurring", sourceRuleId: u.sourceRuleId },
        }),
      ),
    ]);
  }

  return result;
}

export async function setAvailabilityTier(membershipId: string, dateIso: string, halfDay: HalfDay, tier: Tier) {
  const date = parseIsoDateUtc(dateIso);

  await prisma.availability.upsert({
    where: { membershipId_date_halfDay: { membershipId, date, halfDay } },
    create: { membershipId, date, halfDay, tier, source: "manual", sourceRuleId: null },
    update: { tier, source: "manual", sourceRuleId: null },
  });
}

export async function setAvailabilityBulk(
  membershipId: string,
  cells: { dateIso: string; halfDay: HalfDay }[],
  tier: Tier,
) {
  await prisma.$transaction(
    cells.map(({ dateIso, halfDay }) => {
      const date = parseIsoDateUtc(dateIso);
      return prisma.availability.upsert({
        where: { membershipId_date_halfDay: { membershipId, date, halfDay } },
        create: { membershipId, date, halfDay, tier, source: "manual", sourceRuleId: null },
        update: { tier, source: "manual", sourceRuleId: null },
      });
    }),
  );
}
