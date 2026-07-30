import { prisma } from "@/lib/prisma";
import { getAvailabilityCalendarData } from "@/server/availability";
import { parseIsoDateUtc } from "@/server/availability-rules";
import { ensureInvitesForShoot } from "@/server/shoot-detail";
import {
  rankCandidates,
  type CandidateSlot,
  type HalfDayPreference,
  type PersonAvailability,
  type RankedCandidate,
} from "@/server/shoot-suggestions";

export async function getFilmCrew(organizationId: string) {
  return prisma.member.findMany({
    where: { organizationId },
    select: { id: true, roleTags: true, user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });
}

export type SlotSelection = { membershipIds: string[]; placeholderLabels: string[] };

export type SuggestDatesInput = {
  required: SlotSelection;
  general: SlotSelection;
  numDays: number;
  halfDayPreference: HalfDayPreference;
  searchStart: string;
  searchEnd: string;
};

function toSlots(selection: SlotSelection, crewById: Map<string, string>): CandidateSlot[] {
  const memberSlots: CandidateSlot[] = selection.membershipIds.map((membershipId) => ({
    kind: "member",
    membershipId,
    name: crewById.get(membershipId) ?? "Unknown",
  }));
  const placeholderSlots: CandidateSlot[] = selection.placeholderLabels.map((label) => ({
    kind: "placeholder",
    label,
  }));
  return [...memberSlots, ...placeholderSlots];
}

export async function suggestShootDates(
  organizationId: string,
  filmWindow: { start: Date; end: Date },
  input: SuggestDatesInput,
): Promise<RankedCandidate[]> {
  const crew = await getFilmCrew(organizationId);
  const crewById = new Map(crew.map((c) => [c.id, c.user.name]));

  const allMembershipIds = [...new Set([...input.required.membershipIds, ...input.general.membershipIds])];
  const availabilityByMembership = new Map<string, PersonAvailability>();

  await Promise.all(
    allMembershipIds.map(async (membershipId) => {
      const { days } = await getAvailabilityCalendarData(membershipId, filmWindow.start, filmWindow.end);
      const personAvailability: PersonAvailability = new Map();
      for (const day of days) {
        personAvailability.set(day.dateIso, { am: day.am?.tier ?? null, pm: day.pm?.tier ?? null });
      }
      availabilityByMembership.set(membershipId, personAvailability);
    }),
  );

  const searchStart = parseIsoDateUtc(input.searchStart);
  const searchEnd = parseIsoDateUtc(input.searchEnd);

  const results = rankCandidates({
    required: toSlots(input.required, crewById),
    general: toSlots(input.general, crewById),
    numDays: input.numDays,
    halfDayPreference: input.halfDayPreference,
    searchStart,
    searchEnd,
    availabilityByMembership,
  });

  return results.slice(0, 10);
}

export type ConfirmShootInput = {
  status: "tentative" | "confirmed";
  dayIsos: string[];
  halfDayPreference: HalfDayPreference;
  defaultCallTime: string;
  required: SlotSelection;
  general: SlotSelection;
};

export async function createShoot(organizationId: string, input: ConfirmShootInput) {
  const halfDaysPerDay: ("AM" | "PM")[] =
    input.halfDayPreference === "EITHER" ? ["AM", "PM"] : [input.halfDayPreference];

  const shoot = await prisma.shoot.create({
    data: {
      filmId: organizationId,
      status: input.status,
      days: {
        create: input.dayIsos.flatMap((dateIso) =>
          halfDaysPerDay.map((halfDay) => ({
            date: parseIsoDateUtc(dateIso),
            halfDay,
            defaultCallTime: input.defaultCallTime,
          })),
        ),
      },
      slots: {
        create: [
          ...input.required.membershipIds.map((membershipId) => ({
            kind: "required" as const,
            membershipId,
          })),
          ...input.required.placeholderLabels.map((label) => ({
            kind: "required" as const,
            placeholderLabel: label,
          })),
          ...input.general.membershipIds.map((membershipId) => ({
            kind: "general" as const,
            membershipId,
          })),
          ...input.general.placeholderLabels.map((label) => ({
            kind: "general" as const,
            placeholderLabel: label,
          })),
        ],
      },
    },
  });

  if (input.status === "confirmed") await ensureInvitesForShoot(shoot.id);

  return shoot;
}

/**
 * Reassigns a placeholder slot to a real crew member without recreating the
 * shoot (issue #8 acceptance criteria) — the slot row is updated in place.
 */
export async function swapPlaceholderForMember(shootSlotId: string, membershipId: string) {
  const slot = await prisma.shootSlot.findUniqueOrThrow({ where: { id: shootSlotId }, include: { shoot: true } });
  if (slot.membershipId) throw new Error("Slot already holds a real crew member");

  await prisma.shootSlot.update({
    where: { id: shootSlotId },
    data: { membershipId, placeholderLabel: null },
  });

  // A shoot that's already Confirmed already sent its invites — a newly
  // swapped-in real person needs one too, same as everyone else on the roster.
  if (slot.shoot.status === "confirmed") await ensureInvitesForShoot(slot.shootId);
}
