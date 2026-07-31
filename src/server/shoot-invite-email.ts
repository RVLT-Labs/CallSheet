import { prisma } from "@/lib/prisma";
import { sendTemplatedEmail } from "@/lib/email";
import { buildInviteIcs, type IcsShootDay } from "@/lib/ics";
import {
  renderChangeNotificationEmail,
  renderInviteEmail,
  renderReminderEmail,
  type ChangeField,
  type InviteEmailDay,
} from "@/lib/email-templates";
import { toIsoDate } from "@/server/availability-rules";
import { canNudgeInvite, resolveEffectiveCallTime } from "@/server/shoot-roster";
import { isInviteTokenExpired } from "@/server/invite-token";
import { HALF_DAY_LABEL } from "@/lib/half-day";

function appBaseUrl() {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

async function loadInviteForEmail(inviteId: string) {
  return prisma.shootInvite.findUniqueOrThrow({
    where: { id: inviteId },
    include: {
      membership: { include: { user: { select: { name: true, email: true } } } },
      callTimeOverride: true,
      shoot: { include: { days: { orderBy: [{ date: "asc" }, { halfDay: "asc" }] } } },
    },
  });
}

function icsDaysFor(days: { id: string; date: Date; halfDay: "AM" | "PM"; defaultCallTime: string }[]): IcsShootDay[] {
  return days.map((d) => ({ id: d.id, dateIso: toIsoDate(d.date), halfDay: d.halfDay, defaultCallTime: d.defaultCallTime }));
}

/**
 * Sends the shoot-invite email with a per-person .ics attachment reflecting
 * that person's actual call time (their override, or the day default) —
 * issue #10 acceptance criteria. No-login accept/decline links carry the
 * invite's token (spec §7).
 */
export async function sendInviteEmail(inviteId: string) {
  const invite = await loadInviteForEmail(inviteId);
  const shootTitle = invite.shoot.title ?? "your shoot";
  const overridesByDayId = new Map(invite.callTimeOverride.map((o) => [o.shootDayId, o.callTime]));

  const days: InviteEmailDay[] = invite.shoot.days.map((d) => ({
    dateLabel: toIsoDate(d.date),
    halfDayLabel: HALF_DAY_LABEL[d.halfDay],
    callTime: resolveEffectiveCallTime(d.defaultCallTime, overridesByDayId.get(d.id)),
  }));

  const ics = buildInviteIcs({
    shootTitle,
    locationAddress: invite.shoot.locationAddress,
    locationLat: invite.shoot.locationLat,
    locationLng: invite.shoot.locationLng,
    locationMapUrl: invite.shoot.locationMapUrl,
    locationNotes: invite.shoot.locationNotes,
    icsUid: invite.shoot.icsUid,
    icsSequence: invite.shoot.icsSequence,
    days: icsDaysFor(invite.shoot.days),
    overridesByDayId,
  });

  const base = appBaseUrl();
  const { subject, html, text } = renderInviteEmail({
    recipientName: invite.membership.user.name,
    shootTitle,
    days,
    locationAddress: invite.shoot.locationAddress,
    locationNotes: invite.shoot.locationNotes,
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

  await prisma.shootInvite.update({ where: { id: inviteId }, data: { sentAt: new Date() } });
}

/** Reminder for a still-pending invite — the nudge action (#9) and the automatic stale-invite cron (#10) both call this. */
export async function sendReminderEmail(inviteId: string) {
  const invite = await prisma.shootInvite.findUniqueOrThrow({
    where: { id: inviteId },
    include: { membership: { include: { user: { select: { name: true, email: true } } } }, shoot: true },
  });
  if (!canNudgeInvite(invite.status)) return;

  const shootTitle = invite.shoot.title ?? "your shoot";
  const { subject, html, text } = renderReminderEmail({
    recipientName: invite.membership.user.name,
    shootTitle,
    viewUrl: `${appBaseUrl()}/invite/${invite.token}`,
  });

  await prisma.shootInvite.update({ where: { id: inviteId }, data: { lastReminderSentAt: new Date() } });
  await sendTemplatedEmail({ to: invite.membership.user.email, subject, html, text });
}

/**
 * Any edit to a Confirmed shoot's time/location sends a fresh email + .ics
 * with the same UID and an incremented SEQUENCE, so calendar apps treat it as
 * an update, never a silent dashboard-only change (issue #10 acceptance
 * criteria). Declined people and anyone removed from the roster are skipped —
 * they're not attending, so there's nothing to notify them about.
 */
export async function notifyConfirmedShootChange(shootId: string, changes: ChangeField[]) {
  if (changes.length === 0) return;

  const shoot = await prisma.shoot.update({
    where: { id: shootId },
    data: { icsSequence: { increment: 1 } },
    include: { days: { orderBy: [{ date: "asc" }, { halfDay: "asc" }] } },
  });

  const activeSlots = await prisma.shootSlot.findMany({
    where: { shootId, removedAt: null, membershipId: { not: null } },
    select: { membershipId: true },
  });
  const activeMembershipIds = activeSlots.map((s) => s.membershipId!);

  const invites = await prisma.shootInvite.findMany({
    where: { shootId, membershipId: { in: activeMembershipIds }, status: { in: ["pending", "accepted"] } },
    include: {
      membership: { include: { user: { select: { name: true, email: true } } } },
      callTimeOverride: true,
    },
  });

  const shootTitle = shoot.title ?? "the shoot";
  const base = appBaseUrl();

  await Promise.all(
    invites.map(async (invite) => {
      const overridesByDayId = new Map(invite.callTimeOverride.map((o) => [o.shootDayId, o.callTime]));
      const ics = buildInviteIcs({
        shootTitle,
        locationAddress: shoot.locationAddress,
        locationLat: shoot.locationLat,
        locationLng: shoot.locationLng,
        locationMapUrl: shoot.locationMapUrl,
        locationNotes: shoot.locationNotes,
        icsUid: shoot.icsUid,
        icsSequence: shoot.icsSequence,
        days: icsDaysFor(shoot.days),
        overridesByDayId,
      });

      const { subject, html, text } = renderChangeNotificationEmail({
        recipientName: invite.membership.user.name,
        shootTitle,
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
  | { ok: true; shootTitle: string; status: "pending" | "accepted" | "declined"; recipientName: string }
  | { ok: false; reason: "not-found" | "expired" };

export async function getInviteByToken(token: string): Promise<InviteLookup> {
  const invite = await prisma.shootInvite.findUnique({
    where: { token },
    include: { shoot: true, membership: { include: { user: { select: { name: true } } } } },
  });
  if (!invite) return { ok: false, reason: "not-found" };
  if (isInviteTokenExpired(invite.createdAt, new Date())) return { ok: false, reason: "expired" };

  return {
    ok: true,
    shootTitle: invite.shoot.title ?? "the shoot",
    status: invite.status,
    recipientName: invite.membership.user.name,
  };
}

export type RespondResult =
  | { ok: true; shootTitle: string; status: "accepted" | "declined" }
  | { ok: false; reason: "not-found" | "expired" };

/** Accept/Decline with zero login, via the invite's token (spec §7, issue #10 acceptance criteria). */
export async function respondToInvite(token: string, response: "accepted" | "declined"): Promise<RespondResult> {
  const invite = await prisma.shootInvite.findUnique({ where: { token }, include: { shoot: true } });
  if (!invite) return { ok: false, reason: "not-found" };
  if (isInviteTokenExpired(invite.createdAt, new Date())) return { ok: false, reason: "expired" };

  await prisma.shootInvite.update({
    where: { id: invite.id },
    data: { status: response, respondedAt: new Date() },
  });

  return { ok: true, shootTitle: invite.shoot.title ?? "the shoot", status: response };
}
