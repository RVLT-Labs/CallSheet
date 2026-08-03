import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { BlockType } from "@/lib/availability-blocks";
import {
  parseIsoDateUtc,
  resolveAvailabilityWindow,
  toIsoDate,
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
type UpsertRow = {
  date: Date;
  startTime: string;
  endTime: string;
  blockType: BlockType;
  label: string | null;
  sourceRuleId: string;
};

/**
 * Pure diff between a membership's recurring rules and its currently-stored
 * Availability rows: which recurring rows are now stale (rule no longer
 * applies to that date) and which need upserting (rule is new or changed),
 * plus the fully resolved window (manual entries always win — spec §10).
 * Shared by the single-membership and batched persist paths below so they
 * can't drift.
 */
function diffAvailabilityWindow(
  rules: RecurringRule[],
  existing: ExistingAvailabilityRow[],
  overrideDates: Set<string>,
  windowStart: Date,
  windowEnd: Date,
) {
  const manualEntries: ManualEntry[] = existing
    .filter((row) => row.source === "manual")
    .map((row) => ({
      id: row.id,
      date: row.date,
      startTime: row.startTime,
      endTime: row.endTime,
      blockType: row.blockType,
      label: row.label,
    }));

  const resolved = resolveAvailabilityWindow(rules, manualEntries, overrideDates, windowStart, windowEnd);

  const resolvedRecurring = resolved.filter((r) => r.source === "recurring");
  const resolvedByKey = new Map(resolvedRecurring.map((r) => [`${toIsoDate(r.date)}-${r.ruleId}`, r]));

  const existingRecurring = existing.filter((row) => row.source === "recurring");
  const existingByKey = new Map(existingRecurring.map((row) => [`${toIsoDate(row.date)}-${row.sourceRuleId}`, row]));

  const staleRecurringIds = existingRecurring
    .filter((row) => !resolvedByKey.has(`${toIsoDate(row.date)}-${row.sourceRuleId}`))
    .map((row) => row.id);

  const upserts: UpsertRow[] = resolvedRecurring
    .filter((r) => {
      const current = existingByKey.get(`${toIsoDate(r.date)}-${r.ruleId}`);
      return (
        !current ||
        current.startTime !== r.startTime ||
        current.endTime !== r.endTime ||
        current.blockType !== r.blockType ||
        current.label !== r.label
      );
    })
    .map((r) => ({ date: r.date, startTime: r.startTime, endTime: r.endTime, blockType: r.blockType, label: r.label, sourceRuleId: r.ruleId! }));

  return { resolved, staleRecurringIds, upserts };
}

async function loadOverrideDates(membershipId: string, windowStart: Date, windowEnd: Date) {
  const rows = await prisma.availabilityDateOverride.findMany({
    where: { membershipId, date: { gte: windowStart, lte: windowEnd } },
  });
  return new Set(rows.map((r) => toIsoDate(r.date)));
}

/**
 * Re-materializes recurring-rule-derived Availability rows for a membership
 * across a window (bounded by the film's working date range — spec §4.3).
 * Manual rows are never touched. Recurring rows are upserted where a rule now
 * applies and deleted where a rule no longer applies (e.g. after an edit or
 * delete), so a read of the Availability table alone is always the resolved
 * view — downstream consumers (aggregate grid, suggestion algorithm) don't
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
  const [rules, existing, overrideDates] = await Promise.all([
    prisma.recurringAvailabilityRule.findMany({
      where: { membershipId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.availability.findMany({
      where: { membershipId, date: { gte: windowStart, lte: windowEnd } },
    }),
    loadOverrideDates(membershipId, windowStart, windowEnd),
  ]);

  const { resolved, staleRecurringIds, upserts } = diffAvailabilityWindow(
    rules as RecurringRule[],
    existing,
    overrideDates,
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
          where: { membershipId_date_sourceRuleId: { membershipId, date: r.date, sourceRuleId: r.sourceRuleId } },
          create: {
            membershipId,
            date: r.date,
            startTime: r.startTime,
            endTime: r.endTime,
            blockType: r.blockType,
            label: r.label,
            source: "recurring",
            sourceRuleId: r.sourceRuleId,
          },
          update: { startTime: r.startTime, endTime: r.endTime, blockType: r.blockType, label: r.label },
        }),
      ),
    ]);
  }

  return { resolved, rules };
}

export type DayCellBlock = {
  id: string | null; // null for a recurring-derived block — override the date to edit it directly, see clearDateToFree
  startTime: string;
  endTime: string;
  blockType: BlockType;
  label: string | null;
  source: "manual" | "recurring";
  ruleLabel: string | null;
};

export type DayCell = { dateIso: string; blocks: DayCellBlock[] };

function toDays(resolved: ReturnType<typeof resolveAvailabilityWindow>): DayCell[] {
  const byDate = new Map<string, DayCell>();

  for (const entry of resolved) {
    const dateIso = toIsoDate(entry.date);
    const cell = byDate.get(dateIso) ?? { dateIso, blocks: [] };
    cell.blocks.push({
      id: entry.id,
      startTime: entry.startTime,
      endTime: entry.endTime,
      blockType: entry.blockType,
      label: entry.label,
      source: entry.source,
      ruleLabel: entry.ruleLabel,
    });
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

  const [allRules, allExisting, allOverrides] = await Promise.all([
    prisma.recurringAvailabilityRule.findMany({
      where: { membershipId: { in: uniqueIds } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.availability.findMany({
      where: { membershipId: { in: uniqueIds }, date: { gte: windowStart, lte: windowEnd } },
    }),
    prisma.availabilityDateOverride.findMany({
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

  const overridesByMembership = new Map<string, Set<string>>();
  for (const row of allOverrides) {
    const set = overridesByMembership.get(row.membershipId) ?? new Set<string>();
    set.add(toIsoDate(row.date));
    overridesByMembership.set(row.membershipId, set);
  }

  const deleteIds: string[] = [];
  const upserts: (UpsertRow & { membershipId: string })[] = [];

  for (const membershipId of uniqueIds) {
    const rules = rulesByMembership.get(membershipId) ?? [];
    const existing = existingByMembership.get(membershipId) ?? [];
    const overrideDates = overridesByMembership.get(membershipId) ?? new Set<string>();

    const diff = diffAvailabilityWindow(rules as RecurringRule[], existing, overrideDates, windowStart, windowEnd);
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
          where: {
            membershipId_date_sourceRuleId: { membershipId: u.membershipId, date: u.date, sourceRuleId: u.sourceRuleId },
          },
          create: {
            membershipId: u.membershipId,
            date: u.date,
            startTime: u.startTime,
            endTime: u.endTime,
            blockType: u.blockType,
            label: u.label,
            source: "recurring",
            sourceRuleId: u.sourceRuleId,
          },
          update: { startTime: u.startTime, endTime: u.endTime, blockType: u.blockType, label: u.label },
        }),
      ),
    ]);
  }

  return result;
}

export type BlockInput = { startTime: string; endTime: string; blockType: BlockType; label: string | null };

/** Adding a manual block on a date always supersedes whatever a recurring rule would generate there (spec §10). */
export async function createManualBlock(membershipId: string, dateIso: string, input: BlockInput) {
  const date = parseIsoDateUtc(dateIso);
  await prisma.$transaction([
    prisma.availability.create({
      data: { membershipId, date, source: "manual", sourceRuleId: null, ...input },
    }),
    prisma.availabilityDateOverride.deleteMany({ where: { membershipId, date } }),
  ]);
}

export async function createManualBlockBulk(membershipId: string, dateIsos: string[], input: BlockInput) {
  const dates = dateIsos.map(parseIsoDateUtc);
  await prisma.$transaction([
    prisma.availability.createMany({
      data: dates.map((date) => ({ membershipId, date, source: "manual" as const, sourceRuleId: null, ...input })),
    }),
    prisma.availabilityDateOverride.deleteMany({ where: { membershipId, date: { in: dates } } }),
  ]);
}

export async function updateManualBlock(blockId: string, membershipId: string, input: BlockInput) {
  const block = await prisma.availability.findUniqueOrThrow({ where: { id: blockId } });
  if (block.membershipId !== membershipId || block.source !== "manual") throw new Error("Block not found");

  await prisma.availability.update({ where: { id: blockId }, data: input });
}

/**
 * Deletes a manual block. If that was the date's last manual block, the date
 * is marked with an override marker so a recurring rule doesn't silently
 * resume governing it — deleting an override is itself an override (spec §10).
 */
export async function deleteManualBlock(blockId: string, membershipId: string) {
  const block = await prisma.availability.findUniqueOrThrow({ where: { id: blockId } });
  if (block.membershipId !== membershipId || block.source !== "manual") throw new Error("Block not found");

  await prisma.availability.delete({ where: { id: blockId } });

  const remaining = await prisma.availability.count({
    where: { membershipId, date: block.date, source: "manual" },
  });
  if (remaining === 0) {
    await prisma.availabilityDateOverride.upsert({
      where: { membershipId_date: { membershipId, date: block.date } },
      create: { membershipId, date: block.date },
      update: {},
    });
  }
}

/** Explicitly clears a date to fully free, overriding any recurring-rule-derived blocks without adding a replacement. */
export async function clearDateToFree(membershipId: string, dateIso: string) {
  const date = parseIsoDateUtc(dateIso);
  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { membershipId, date, source: "manual" } }),
    prisma.availabilityDateOverride.upsert({
      where: { membershipId_date: { membershipId, date } },
      create: { membershipId, date },
      update: {},
    }),
  ]);
}
