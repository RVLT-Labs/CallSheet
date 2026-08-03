import { prisma } from "@/lib/prisma";
import { getAvailabilityCalendarDataBatch } from "@/server/availability";
import { parseIsoDateUtc } from "@/server/availability-rules";
import { getFilmCrew } from "@/server/shoot-planning";
import { ensureInvitesForMeeting } from "@/server/meeting-detail";
import {
  rankCandidates,
  type CandidateSlot,
  type HalfDayPreference,
  type PersonAvailability,
  type RankedCandidate,
} from "@/server/scheduling-suggestions";

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

export async function suggestMeetingDates(
  organizationId: string,
  filmWindow: { start: Date; end: Date },
  input: SuggestDatesInput,
): Promise<RankedCandidate[]> {
  const crew = await getFilmCrew(organizationId);
  const crewById = new Map(crew.map((c) => [c.id, c.user.name]));

  const allMembershipIds = [...new Set([...input.required.membershipIds, ...input.general.membershipIds])];
  const calendarByMembership = await getAvailabilityCalendarDataBatch(
    allMembershipIds,
    filmWindow.start,
    filmWindow.end,
  );

  const availabilityByMembership = new Map<string, PersonAvailability>();
  for (const membershipId of allMembershipIds) {
    const days = calendarByMembership.get(membershipId)?.days ?? [];
    const personAvailability: PersonAvailability = new Map();
    for (const day of days) {
      personAvailability.set(day.dateIso, { am: day.am?.tier ?? null, pm: day.pm?.tier ?? null });
    }
    availabilityByMembership.set(membershipId, personAvailability);
  }

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

export type ConfirmMeetingInput = {
  status: "tentative" | "confirmed";
  dayIsos: string[];
  halfDayPreference: HalfDayPreference;
  defaultStartTime: string;
  required: SlotSelection;
  general: SlotSelection;
};

export async function createMeeting(organizationId: string, input: ConfirmMeetingInput) {
  const halfDaysPerDay: ("AM" | "PM")[] =
    input.halfDayPreference === "EITHER" ? ["AM", "PM"] : [input.halfDayPreference];

  const meeting = await prisma.meeting.create({
    data: {
      filmId: organizationId,
      status: input.status,
      days: {
        create: input.dayIsos.flatMap((dateIso) =>
          halfDaysPerDay.map((halfDay) => ({
            date: parseIsoDateUtc(dateIso),
            halfDay,
            defaultStartTime: input.defaultStartTime,
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

  if (input.status === "confirmed") await ensureInvitesForMeeting(meeting.id);

  return meeting;
}

/**
 * Reassigns a placeholder slot to a real crew member without recreating the
 * meeting — the slot row is updated in place.
 */
export async function swapPlaceholderForMember(meetingSlotId: string, membershipId: string) {
  const slot = await prisma.meetingSlot.findUniqueOrThrow({
    where: { id: meetingSlotId },
    include: { meeting: true },
  });
  if (slot.membershipId) throw new Error("Slot already holds a real crew member");

  await prisma.meetingSlot.update({
    where: { id: meetingSlotId },
    data: { membershipId, placeholderLabel: null },
  });

  // A meeting that's already Confirmed already sent its invites — a newly
  // swapped-in real person needs one too, same as everyone else on the roster.
  if (slot.meeting.status === "confirmed") await ensureInvitesForMeeting(slot.meetingId);
}
