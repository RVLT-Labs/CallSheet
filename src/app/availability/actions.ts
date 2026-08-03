"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import type { BlockType } from "@/lib/availability-blocks";
import {
  clearDateToFree,
  createManualBlock,
  createManualBlockBulk,
  deleteManualBlock,
  requireActiveMembership,
  resolveAndPersistAvailabilityWindow,
  updateManualBlock,
  type BlockInput,
} from "@/server/availability";
import { parseIsoDateUtc } from "@/server/availability-rules";

function filmWindow(film: { dateRangeStart: Date | null; dateRangeEnd: Date | null }) {
  if (!film.dateRangeStart || !film.dateRangeEnd) throw new Error("Film has no working date range set");
  return { windowStart: film.dateRangeStart, windowEnd: film.dateRangeEnd };
}

export async function addBlock(dateIso: string, input: BlockInput) {
  const { membershipId } = await requireActiveMembership();
  await createManualBlock(membershipId, dateIso, input);
  revalidatePath("/availability");
}

export async function addBlockBulk(dateIsos: string[], input: BlockInput) {
  const { membershipId } = await requireActiveMembership();
  await createManualBlockBulk(membershipId, dateIsos, input);
  revalidatePath("/availability");
}

export async function editBlock(blockId: string, input: BlockInput) {
  const { membershipId } = await requireActiveMembership();
  await updateManualBlock(blockId, membershipId, input);
  revalidatePath("/availability");
}

export async function removeBlock(blockId: string) {
  const { membershipId } = await requireActiveMembership();
  await deleteManualBlock(blockId, membershipId);
  revalidatePath("/availability");
}

export async function clearDay(dateIso: string) {
  const { membershipId } = await requireActiveMembership();
  await clearDateToFree(membershipId, dateIso);
  revalidatePath("/availability");
}

export type RecurringRuleInput = {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  blockType: BlockType;
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
      startTime: input.startTime,
      endTime: input.endTime,
      blockType: input.blockType,
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
      startTime: input.startTime,
      endTime: input.endTime,
      blockType: input.blockType,
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
