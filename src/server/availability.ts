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

/**
 * Re-materializes recurring-rule-derived Availability rows for a membership
 * across a window (bounded by the film's working date range — spec §4.3).
 * Manual rows are never touched. Recurring rows are upserted where a rule now
 * applies and deleted where a rule no longer applies (e.g. after an edit or
 * delete), so a read of the Availability table alone is always the resolved
 * view — downstream epics (aggregate grid #7, suggestion algorithm #8) don't
 * need to re-derive precedence themselves.
 */
export async function resolveAndPersistAvailabilityWindow(
  membershipId: string,
  windowStart: Date,
  windowEnd: Date,
) {
  const [rules, existing] = await Promise.all([
    prisma.recurringAvailabilityRule.findMany({ where: { membershipId } }),
    prisma.availability.findMany({
      where: { membershipId, date: { gte: windowStart, lte: windowEnd } },
    }),
  ]);

  const manualEntries: ManualEntry[] = existing
    .filter((row) => row.source === "manual")
    .map((row) => ({ date: row.date, halfDay: row.halfDay, tier: row.tier }));

  const resolved = resolveAvailabilityWindow(
    rules as RecurringRule[],
    manualEntries,
    windowStart,
    windowEnd,
  );

  const resolvedRecurring = resolved.filter((r) => r.source === "recurring");
  const resolvedKeys = new Set(resolvedRecurring.map((r) => `${toIsoDate(r.date)}-${r.halfDay}`));

  const staleRecurringIds = existing
    .filter((row) => row.source === "recurring" && !resolvedKeys.has(`${toIsoDate(row.date)}-${row.halfDay}`))
    .map((row) => row.id);

  const existingByKey = new Map(existing.map((row) => [`${toIsoDate(row.date)}-${row.halfDay}`, row]));

  const toUpsert = resolvedRecurring.filter((r) => {
    const current = existingByKey.get(`${toIsoDate(r.date)}-${r.halfDay}`);
    return !current || current.tier !== r.tier || current.source !== "recurring" || current.sourceRuleId !== r.ruleId;
  });

  if (staleRecurringIds.length === 0 && toUpsert.length === 0) return;

  await prisma.$transaction([
    ...(staleRecurringIds.length
      ? [prisma.availability.deleteMany({ where: { id: { in: staleRecurringIds } } })]
      : []),
    ...toUpsert.map((r) =>
      prisma.availability.upsert({
        where: { membershipId_date_halfDay: { membershipId, date: r.date, halfDay: r.halfDay } },
        create: {
          membershipId,
          date: r.date,
          halfDay: r.halfDay,
          tier: r.tier,
          source: "recurring",
          sourceRuleId: r.ruleId,
        },
        update: { tier: r.tier, source: "recurring", sourceRuleId: r.ruleId },
      }),
    ),
  ]);
}

export type DayCell = {
  dateIso: string;
  am: { tier: Tier; source: "manual" | "recurring"; ruleLabel: string | null } | null;
  pm: { tier: Tier; source: "manual" | "recurring"; ruleLabel: string | null } | null;
};

export async function getAvailabilityCalendarData(membershipId: string, windowStart: Date, windowEnd: Date) {
  await resolveAndPersistAvailabilityWindow(membershipId, windowStart, windowEnd);

  const [rows, rules] = await Promise.all([
    prisma.availability.findMany({
      where: { membershipId, date: { gte: windowStart, lte: windowEnd } },
    }),
    prisma.recurringAvailabilityRule.findMany({
      where: { membershipId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const ruleById = new Map(rules.map((r) => [r.id, r]));
  const byDate = new Map<string, DayCell>();

  for (const row of rows) {
    const dateIso = toIsoDate(row.date);
    const cell = byDate.get(dateIso) ?? { dateIso, am: null, pm: null };
    const entry = {
      tier: row.tier as Tier,
      source: row.source as "manual" | "recurring",
      ruleLabel: (row.sourceRuleId && ruleById.get(row.sourceRuleId)?.label) || null,
    };
    if (row.halfDay === "AM") cell.am = entry;
    else cell.pm = entry;
    byDate.set(dateIso, cell);
  }

  return { days: [...byDate.values()], rules, ruleById };
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
