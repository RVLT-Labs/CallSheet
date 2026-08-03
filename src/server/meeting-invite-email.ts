import { prisma } from "@/lib/prisma";
import { sendTemplatedEmail } from "@/lib/email";
import { buildInviteIcs, type IcsEventDay } from "@/lib/ics";
import {
  renderChangeNotificationEmail,
  renderInviteEmail,
  renderReminderEmail,
  type ChangeField,
  type InviteEmailDay,
} from "@/lib/email-templates";
import { toIsoDate } from "@/server/availability-rules";
import { canNudgeInvite, resolveEffectiveTime } from "@/server/invite-roster";
import { isInviteTokenExpired } from "@/server/invite-token";

function appBaseUrl() {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

async function loadInviteForEmail(inviteId: string) {
  return prisma.meetingInvite.findUniqueOrThrow({
    where: { id: inviteId },
    include: {
      membership: { include: { user: { select: { name: true, email: true } } } },
      startTimeOverride: true,
      meeting: { include: { days: { orderBy: { date: "asc" } } } },
    },
  });
}

function icsDaysFor(
  days: { id: string; date: Date; estimatedEndTime: string; defaultStartTime: string }[],
  overridesByDayId: Map<string, string>,
): IcsEventDay[] {
  return days.map((d) => ({
    id: d.id,
    dateIso: toIsoDate(d.date),
    startTime: resolveEffectiveTime(d.defaultStartTime, overridesByDayId.get(d.id)),
    estimatedEndTime: d.estimatedEndTime,
  }));
}

/**
 * Sends the meeting-invite email with a per-person .ics attachment reflecting
 * that person's actual start time (their override, or the day default).
 * No-login accept/decline links carry the invite's token (spec §7).
 */
export async function sendInviteEmail(inviteId: string) {
  const invite = await loadInviteForEmail(inviteId);
  const meetingTitle = invite.meeting.title ?? "your meeting";
  const overridesByDayId = new Map(invite.startTimeOverride.map((o) => [o.meetingDayId, o.startTime]));

  const days: InviteEmailDay[] = invite.meeting.days.map((d) => ({
    dateLabel: toIsoDate(d.date),
    time: resolveEffectiveTime(d.defaultStartTime, overridesByDayId.get(d.id)),
  }));

  const ics = buildInviteIcs({
    eventTitle: meetingTitle,
    filename: "meeting.ics",
    locationAddress: invite.meeting.locationAddress,
    locationLat: invite.meeting.locationLat,
    locationLng: invite.meeting.locationLng,
    locationMapUrl: invite.meeting.locationMapUrl,
    locationNotes: invite.meeting.locationNotes,
    icsUid: invite.meeting.icsUid,
    icsSequence: invite.meeting.icsSequence,
    days: icsDaysFor(invite.meeting.days, overridesByDayId),
  });

  const base = appBaseUrl();
  const { subject, html, text } = renderInviteEmail({
    kind: "meeting",
    recipientName: invite.membership.user.name,
    eventTitle: meetingTitle,
    days,
    locationAddress: invite.meeting.locationAddress,
    locationNotes: invite.meeting.locationNotes,
    acceptUrl: `${base}/invite/${invite.token}/accept`,
    declineUrl: `${base}/invite/${invite.token}/decline`,
  });

  await sendTemplatedEmail({
    to: invite.membership.user.email,
    subject,
    html,
    text,
    attachment: ics ? { filename: ics.filename, content: ics.content, contentType: "text/calendar" } : undefined,
  });

  await prisma.meetingInvite.update({ where: { id: inviteId }, data: { sentAt: new Date() } });
}

/** Reminder for a still-pending invite — the nudge action and the automatic stale-invite cron both call this. */
export async function sendReminderEmail(inviteId: string) {
  const invite = await prisma.meetingInvite.findUniqueOrThrow({
    where: { id: inviteId },
    include: { membership: { include: { user: { select: { name: true, email: true } } } }, meeting: true },
  });
  if (!canNudgeInvite(invite.status)) return;

  const meetingTitle = invite.meeting.title ?? "your meeting";
  const { subject, html, text } = renderReminderEmail({
    recipientName: invite.membership.user.name,
    eventTitle: meetingTitle,
    viewUrl: `${appBaseUrl()}/invite/${invite.token}`,
  });

  await prisma.meetingInvite.update({ where: { id: inviteId }, data: { lastReminderSentAt: new Date() } });
  await sendTemplatedEmail({ to: invite.membership.user.email, subject, html, text });
}

/**
 * Any edit to a Confirmed meeting's time/location sends a fresh email + .ics
 * with the same UID and an incremented SEQUENCE, so calendar apps treat it as
 * an update, never a silent dashboard-only change. Declined people and anyone
 * removed from the roster are skipped — they're not attending, so there's
 * nothing to notify them about.
 */
export async function notifyConfirmedMeetingChange(meetingId: string, changes: ChangeField[]) {
  if (changes.length === 0) return;

  const meeting = await prisma.meeting.update({
    where: { id: meetingId },
    data: { icsSequence: { increment: 1 } },
    include: { days: { orderBy: { date: "asc" } } },
  });

  const activeSlots = await prisma.meetingSlot.findMany({
    where: { meetingId, removedAt: null, membershipId: { not: null } },
    select: { membershipId: true },
  });
  const activeMembershipIds = activeSlots.map((s) => s.membershipId!);

  const invites = await prisma.meetingInvite.findMany({
    where: { meetingId, membershipId: { in: activeMembershipIds }, status: { in: ["pending", "accepted"] } },
    include: {
      membership: { include: { user: { select: { name: true, email: true } } } },
      startTimeOverride: true,
    },
  });

  const meetingTitle = meeting.title ?? "the meeting";
  const base = appBaseUrl();

  await Promise.all(
    invites.map(async (invite) => {
      const overridesByDayId = new Map(invite.startTimeOverride.map((o) => [o.meetingDayId, o.startTime]));
      const ics = buildInviteIcs({
        eventTitle: meetingTitle,
        filename: "meeting.ics",
        locationAddress: meeting.locationAddress,
        locationLat: meeting.locationLat,
        locationLng: meeting.locationLng,
        locationMapUrl: meeting.locationMapUrl,
        locationNotes: meeting.locationNotes,
        icsUid: meeting.icsUid,
        icsSequence: meeting.icsSequence,
        days: icsDaysFor(meeting.days, overridesByDayId),
      });

      const { subject, html, text } = renderChangeNotificationEmail({
        kind: "meeting",
        recipientName: invite.membership.user.name,
        eventTitle: meetingTitle,
        changes,
        viewUrl: `${base}/invite/${invite.token}`,
      });

      await sendTemplatedEmail({
        to: invite.membership.user.email,
        subject,
        html,
        text,
        attachment: ics ? { filename: ics.filename, content: ics.content, contentType: "text/calendar" } : undefined,
      });
    }),
  );
}

export type InviteLookup =
  | { ok: true; meetingTitle: string; status: "pending" | "accepted" | "declined"; recipientName: string }
  | { ok: false; reason: "not-found" | "expired" };

export async function getInviteByToken(token: string): Promise<InviteLookup> {
  const invite = await prisma.meetingInvite.findUnique({
    where: { token },
    include: { meeting: true, membership: { include: { user: { select: { name: true } } } } },
  });
  if (!invite) return { ok: false, reason: "not-found" };
  if (isInviteTokenExpired(invite.createdAt, new Date())) return { ok: false, reason: "expired" };

  return {
    ok: true,
    meetingTitle: invite.meeting.title ?? "the meeting",
    status: invite.status,
    recipientName: invite.membership.user.name,
  };
}

export type RespondResult =
  | { ok: true; meetingTitle: string; status: "accepted" | "declined" }
  | { ok: false; reason: "not-found" | "expired" };

/** Accept/Decline with zero login, via the invite's token (spec §7). */
export async function respondToInvite(token: string, response: "accepted" | "declined"): Promise<RespondResult> {
  const invite = await prisma.meetingInvite.findUnique({ where: { token }, include: { meeting: true } });
  if (!invite) return { ok: false, reason: "not-found" };
  if (isInviteTokenExpired(invite.createdAt, new Date())) return { ok: false, reason: "expired" };

  await prisma.meetingInvite.update({
    where: { id: invite.id },
    data: {
      status: response,
      respondedAt: new Date(),
      // The crew member's own response always wins over a prior organiser override.
      responseSource: "crew",
      overriddenByMembershipId: null,
    },
  });

  return { ok: true, meetingTitle: invite.meeting.title ?? "the meeting", status: response };
}
