import { randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";
import type { Tier } from "@/lib/availability-tiers";
import { HALF_DAY_LABEL } from "@/lib/half-day";
import { getAvailabilityCalendarDataBatch } from "@/server/availability";
import { toIsoDate } from "@/server/availability-rules";
import { removalOutcomeForInvite, shouldNotifyConfirmedEventChange, type InviteStatus } from "@/server/invite-roster";
import { notifyConfirmedMeetingChange, sendInviteEmail, sendReminderEmail } from "@/server/meeting-invite-email";
import type { ChangeField } from "@/lib/email-templates";

export async function getMeetingDetail(meetingId: string, organizationId: string) {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, filmId: organizationId },
    include: {
      days: { orderBy: [{ date: "asc" }, { halfDay: "asc" }] },
      slots: {
        include: { membership: { include: { user: { select: { name: true, email: true } } } } },
        orderBy: { id: "asc" },
      },
      invites: {
        include: {
          membership: { include: { user: { select: { name: true, email: true } } } },
          startTimeOverride: true,
        },
      },
    },
  });
  return meeting;
}

function generateInviteToken() {
  return randomBytes(24).toString("hex");
}

/**
 * Creates one pending MeetingInvite per real (non-placeholder) crew member
 * across the meeting's required + general slots — this is what "confirming a
 * meeting" means — then sends each one its invite email with a per-person
 * .ics attachment and no-login accept/decline links.
 */
export async function ensureInvitesForMeeting(meetingId: string) {
  const slots = await prisma.meetingSlot.findMany({
    where: { meetingId, membershipId: { not: null }, removedAt: null },
  });
  const membershipIds = [...new Set(slots.map((s) => s.membershipId!))];
  if (membershipIds.length === 0) return;

  const existing = await prisma.meetingInvite.findMany({
    where: { meetingId, membershipId: { in: membershipIds } },
    select: { membershipId: true },
  });
  const existingIds = new Set(existing.map((e) => e.membershipId));
  const toCreate = membershipIds.filter((id) => !existingIds.has(id));
  if (toCreate.length === 0) return;

  const created = await Promise.all(
    toCreate.map((membershipId) =>
      prisma.meetingInvite.create({ data: { meetingId, membershipId, token: generateInviteToken() } }),
    ),
  );

  await Promise.all(created.map((invite) => sendInviteEmail(invite.id)));
}

/** Tentative -> Confirmed is an explicit action distinct from creation. */
export async function confirmMeeting(meetingId: string, organizationId: string) {
  const meeting = await prisma.meeting.findFirstOrThrow({ where: { id: meetingId, filmId: organizationId } });
  if (meeting.status !== "tentative") return meeting;

  const updated = await prisma.meeting.update({ where: { id: meetingId }, data: { status: "confirmed" } });
  await ensureInvitesForMeeting(meetingId);
  return updated;
}

export type UpdateMeetingDetailsInput = {
  title?: string;
  locationAddress?: string;
  locationPlaceId?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationMapUrl?: string;
  locationNotes?: string;
  notes?: string;
  dayStartTimes?: { dayId: string; defaultStartTime: string }[];
};

/**
 * Editing a Confirmed meeting's time or location must never be a silent
 * dashboard-only change — this diffs the two fields that actually matter to
 * someone already invited (location, per-day start time; not title/map-link/
 * notes, which are convenience metadata) and fires a change-notification
 * email + fresh .ics when either one moves on an already-Confirmed meeting.
 * A Tentative meeting has no invites to notify either way.
 */
export async function updateMeetingDetails(
  meetingId: string,
  organizationId: string,
  data: UpdateMeetingDetailsInput,
) {
  const before = await prisma.meeting.findFirst({
    where: { id: meetingId, filmId: organizationId },
    include: { days: true },
  });
  if (!before) return;

  const changes: ChangeField[] = [];

  const nextLocationAddress = data.locationAddress !== undefined ? data.locationAddress.trim() || null : undefined;
  if (nextLocationAddress !== undefined && nextLocationAddress !== before.locationAddress) {
    changes.push({
      label: "Location",
      oldValue: before.locationAddress ?? "Not set",
      newValue: nextLocationAddress ?? "Not set",
    });
  }

  await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      title: data.title !== undefined ? (data.title.trim() || null) : undefined,
      locationAddress: nextLocationAddress,
      locationPlaceId: data.locationPlaceId !== undefined ? data.locationPlaceId : undefined,
      locationLat: data.locationLat !== undefined ? data.locationLat : undefined,
      locationLng: data.locationLng !== undefined ? data.locationLng : undefined,
      locationMapUrl: data.locationMapUrl !== undefined ? (data.locationMapUrl.trim() || null) : undefined,
      locationNotes: data.locationNotes !== undefined ? (data.locationNotes.trim() || null) : undefined,
      notes: data.notes !== undefined ? (data.notes.trim() || null) : undefined,
    },
  });

  if (data.dayStartTimes) {
    const dayById = new Map(before.days.map((d) => [d.id, d]));
    for (const { dayId, defaultStartTime } of data.dayStartTimes) {
      const day = dayById.get(dayId);
      if (!day || day.defaultStartTime === defaultStartTime) continue;

      changes.push({
        label: `${toIsoDate(day.date)} ${HALF_DAY_LABEL[day.halfDay]} start time`,
        oldValue: day.defaultStartTime,
        newValue: defaultStartTime,
      });
      await prisma.meetingDay.update({ where: { id: dayId }, data: { defaultStartTime } });
    }
  }

  if (shouldNotifyConfirmedEventChange(before.status, changes.length)) {
    await notifyConfirmedMeetingChange(meetingId, changes);
  }
}

/** Resends a reminder only to that one pending person. */
export async function nudgeInvite(inviteId: string) {
  await sendReminderEmail(inviteId);
}

/**
 * Removes a person from a meeting's roster. If they haven't responded yet,
 * there's no history worth keeping, so the slot and any pending invite are
 * deleted outright. If they already responded, the slot is soft-removed
 * (kept, marked removed) and the invite is left untouched so the historical
 * RSVP record survives.
 */
export async function removePersonFromMeeting(meetingId: string, membershipId: string) {
  const [slots, invite] = await Promise.all([
    prisma.meetingSlot.findMany({ where: { meetingId, membershipId, removedAt: null } }),
    prisma.meetingInvite.findUnique({ where: { meetingId_membershipId: { meetingId, membershipId } } }),
  ]);

  const outcome = removalOutcomeForInvite(invite?.status ?? null);

  if (outcome === "hard-delete") {
    await prisma.$transaction([
      prisma.meetingSlot.deleteMany({ where: { id: { in: slots.map((s) => s.id) } } }),
      ...(invite ? [prisma.meetingInvite.delete({ where: { id: invite.id } })] : []),
    ]);
  } else {
    await prisma.meetingSlot.updateMany({
      where: { id: { in: slots.map((s) => s.id) } },
      data: { removedAt: new Date() },
    });
  }
}

/**
 * Organiser-set RSVP status — deciding for someone who hasn't responded yet,
 * or overriding e.g. a Declined to Accepted. Same manual-overrides-recurring
 * precedence shape as availability (spec §10): this holds until the crew
 * member responds via their own accept/decline link, which always wins and
 * resets responseSource back to "crew" (see respondToInvite).
 */
export async function overrideInviteStatus(
  meetingId: string,
  organizationId: string,
  inviteId: string,
  status: InviteStatus,
  overriddenByMembershipId: string,
) {
  const invite = await prisma.meetingInvite.findFirst({
    where: { id: inviteId, meetingId, meeting: { filmId: organizationId } },
  });
  if (!invite) return;

  await prisma.meetingInvite.update({
    where: { id: invite.id },
    data: { status, responseSource: "organiser", overriddenByMembershipId, respondedAt: new Date() },
  });
}

export async function setStartTimeOverride(inviteId: string, meetingDayId: string, startTime: string) {
  if (!startTime) {
    await prisma.meetingCallTimeOverride
      .delete({ where: { meetingInviteId_meetingDayId: { meetingInviteId: inviteId, meetingDayId } } })
      .catch(() => {}); // no override to clear — falling back to the day default is already the resting state
    return;
  }

  await prisma.meetingCallTimeOverride.upsert({
    where: { meetingInviteId_meetingDayId: { meetingInviteId: inviteId, meetingDayId } },
    create: { meetingInviteId: inviteId, meetingDayId, startTime },
    update: { startTime },
  });
}

// Same value scale as scheduling-suggestions.ts's worst-day rule — unknown is
// a light penalty between OK and Unavailable, never treated as a red flag.
const TIER_VALUE: Record<Tier, number> = { best: 1, ok: 0.6, unavailable: 0 };
const UNKNOWN_VALUE = 0.4;

function tierValue(tier: Tier | null) {
  return tier === null ? UNKNOWN_VALUE : TIER_VALUE[tier];
}

/**
 * Availability ratio only, no roster — a Tentative meeting has no invites
 * yet. Mirrors the suggestion algorithm's worst-day rule for a person
 * spanning multiple days of this meeting.
 */
export async function getTentativeAvailabilityRatio(meeting: {
  id: string;
  days: { date: Date; halfDay: "AM" | "PM" }[];
  slots: { membershipId: string | null; removedAt: Date | null }[];
}) {
  const membershipIds = [
    ...new Set(meeting.slots.filter((s) => s.membershipId && !s.removedAt).map((s) => s.membershipId!)),
  ];
  if (membershipIds.length === 0 || meeting.days.length === 0) return { availableCount: 0, totalCount: 0 };

  const dates = meeting.days.map((d) => d.date);
  const windowStart = new Date(Math.min(...dates.map((d) => d.getTime())));
  const windowEnd = new Date(Math.max(...dates.map((d) => d.getTime())));

  const calendarByMembership = await getAvailabilityCalendarDataBatch(membershipIds, windowStart, windowEnd);

  let availableCount = 0;
  for (const membershipId of membershipIds) {
    const days = calendarByMembership.get(membershipId)?.days ?? [];
    const byDate = new Map(days.map((d) => [d.dateIso, d]));

    let worstTier: Tier | null = null;
    let worstValue = Infinity;
    for (const meetingDay of meeting.days) {
      const cell = byDate.get(toIsoDate(meetingDay.date));
      const tier = meetingDay.halfDay === "AM" ? (cell?.am?.tier ?? null) : (cell?.pm?.tier ?? null);
      const value = tierValue(tier);
      if (value < worstValue) {
        worstValue = value;
        worstTier = tier;
      }
    }
    if (worstTier === "best" || worstTier === "ok") availableCount++;
  }

  return { availableCount, totalCount: membershipIds.length };
}
