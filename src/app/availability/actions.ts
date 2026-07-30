"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import type { Tier } from "@/lib/availability-tiers";
import {
  requireActiveMembership,
  resolveAndPersistAvailabilityWindow,
  setAvailabilityBulk,
  setAvailabilityTier,
} from "@/server/availability";
import { parseIsoDateUtc, type HalfDay } from "@/server/availability-rules";

function filmWindow(film: { dateRangeStart: Date | null; dateRangeEnd: Date | null }) {
  if (!film.dateRangeStart || !film.dateRangeEnd) throw new Error("Film has no working date range set");
  return { windowStart: film.dateRangeStart, windowEnd: film.dateRangeEnd };
}

export async function setDayTier(dateIso: string, halfDay: HalfDay, tier: Tier) {
  const { membershipId } = await requireActiveMembership();
  await setAvailabilityTier(membershipId, dateIso, halfDay, tier);
  revalidatePath("/availability");
}

export async function setBulkTier(cells: { dateIso: string; halfDay: HalfDay }[], tier: Tier) {
  const { membershipId } = await requireActiveMembership();
  await setAvailabilityBulk(membershipId, cells, tier);
  revalidatePath("/availability");
}

export type RecurringRuleInput = {
  daysOfWeek: number[];
  halfDay: HalfDay | null;
  tier: Tier;
  label: string;
  effectiveStart: string;
  effectiveEnd: string;
};

export async function createRecurringRule(input: RecurringRuleInput) {
  const { membershipId, film } = await requireActiveMembership();
  const { windowStart, windowEnd } = filmWindow(film);

  if (input.daysOfWeek.length === 0) throw new Error("Pick at least one day");

  const effectiveStart = parseIsoDateUtc(input.effectiveStart);
  const effectiveEnd = input.effectiveEnd ? parseIsoDateUtc(input.effectiveEnd) : null;

  await prisma.recurringAvailabilityRule.createMany({
    data: input.daysOfWeek.map((dayOfWeek) => ({
      membershipId,
      dayOfWeek,
      halfDay: input.halfDay,
      tier: input.tier,
      label: input.label.trim() || null,
      effectiveStart,
      effectiveEnd,
    })),
  });

  await resolveAndPersistAvailabilityWindow(membershipId, windowStart, windowEnd);
  revalidatePath("/availability");
}

export async function updateRecurringRule(
  ruleId: string,
  input: Omit<RecurringRuleInput, "daysOfWeek"> & { dayOfWeek: number },
) {
  const { membershipId, film } = await requireActiveMembership();
  const { windowStart, windowEnd } = filmWindow(film);

  const rule = await prisma.recurringAvailabilityRule.findUnique({ where: { id: ruleId } });
  if (!rule || rule.membershipId !== membershipId) throw new Error("Rule not found");

  const effectiveStart = parseIsoDateUtc(input.effectiveStart);
  const effectiveEnd = input.effectiveEnd ? parseIsoDateUtc(input.effectiveEnd) : null;

  await prisma.recurringAvailabilityRule.update({
    where: { id: ruleId },
    data: {
      dayOfWeek: input.dayOfWeek,
      halfDay: input.halfDay,
      tier: input.tier,
      label: input.label.trim() || null,
      effectiveStart,
      effectiveEnd,
    },
  });

  await resolveAndPersistAvailabilityWindow(membershipId, windowStart, windowEnd);
  revalidatePath("/availability");
}

export async function deleteRecurringRule(ruleId: string) {
  const { membershipId, film } = await requireActiveMembership();
  const { windowStart, windowEnd } = filmWindow(film);

  const rule = await prisma.recurringAvailabilityRule.findUnique({ where: { id: ruleId } });
  if (!rule || rule.membershipId !== membershipId) throw new Error("Rule not found");

  await prisma.recurringAvailabilityRule.delete({ where: { id: ruleId } });
  await resolveAndPersistAvailabilityWindow(membershipId, windowStart, windowEnd);
  revalidatePath("/availability");
}
