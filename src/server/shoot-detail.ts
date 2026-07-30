import { randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";
import { sendPlainEmail } from "@/lib/email";
import type { Tier } from "@/lib/availability-tiers";
import { getAvailabilityCalendarData } from "@/server/availability";
import { toIsoDate } from "@/server/availability-rules";
import { canNudgeInvite, removalOutcomeForInvite } from "@/server/shoot-roster";

export async function getShootDetail(shootId: string, organizationId: string) {
  const shoot = await prisma.shoot.findFirst({
    where: { id: shootId, filmId: organizationId },
    include: {
      days: { orderBy: [{ date: "asc" }, { halfDay: "asc" }] },
      slots: {
        include: { membership: { include: { user: { select: { name: true, email: true } } } } },
        orderBy: { id: "asc" },
      },
      invites: {
        include: {
          membership: { include: { user: { select: { name: true, email: true } } } },
          callTimeOverride: true,
        },
      },
    },
  });
  return shoot;
}

function generateInviteToken() {
  return randomBytes(24).toString("hex");
}

/**
 * Creates one pending ShootInvite per real (non-placeholder) crew member
 * across the shoot's required + general slots — this is what "confirming a
 * shoot" means (issue #9 scope). Actual email dispatch/tokens for no-login
 * accept-decline links and the .ics attachment are issue #10's scope; this
 * just establishes the invite record the roster/RSVP UI reads from.
 */
export async function ensureInvitesForShoot(shootId: string) {
  const slots = await prisma.shootSlot.findMany({
    where: { shootId, membershipId: { not: null }, removedAt: null },
  });
  const membershipIds = [...new Set(slots.map((s) => s.membershipId!))];
  if (membershipIds.length === 0) return;

  const existing = await prisma.shootInvite.findMany({
    where: { shootId, membershipId: { in: membershipIds } },
    select: { membershipId: true },
  });
  const existingIds = new Set(existing.map((e) => e.membershipId));
  const toCreate = membershipIds.filter((id) => !existingIds.has(id));
  if (toCreate.length === 0) return;

  await prisma.shootInvite.createMany({
    data: toCreate.map((membershipId) => ({
      shootId,
      membershipId,
      token: generateInviteToken(),
    })),
  });
}

/** Tentative -> Confirmed is an explicit action distinct from creation (issue #9 acceptance criteria). */
export async function confirmShoot(shootId: string, organizationId: string) {
  const shoot = await prisma.shoot.findFirstOrThrow({ where: { id: shootId, filmId: organizationId } });
  if (shoot.status !== "tentative") return shoot;

  const updated = await prisma.shoot.update({ where: { id: shootId }, data: { status: "confirmed" } });
  await ensureInvitesForShoot(shootId);
  return updated;
}

export async function updateShootDetails(
  shootId: string,
  organizationId: string,
  data: { title?: string; locationAddress?: string; locationMapUrl?: string; locationNotes?: string; notes?: string },
) {
  await prisma.shoot.updateMany({
    where: { id: shootId, filmId: organizationId },
    data: {
      title: data.title !== undefined ? (data.title.trim() || null) : undefined,
      locationAddress: data.locationAddress !== undefined ? (data.locationAddress.trim() || null) : undefined,
      locationMapUrl: data.locationMapUrl !== undefined ? (data.locationMapUrl.trim() || null) : undefined,
      locationNotes: data.locationNotes !== undefined ? (data.locationNotes.trim() || null) : undefined,
      notes: data.notes !== undefined ? (data.notes.trim() || null) : undefined,
    },
  });
}

/** Resends a reminder only to that one pending person (issue #9 acceptance criteria). */
export async function nudgeInvite(inviteId: string) {
  const invite = await prisma.shootInvite.findUniqueOrThrow({
    where: { id: inviteId },
    include: {
      membership: { include: { user: { select: { name: true, email: true } } } },
      shoot: true,
    },
  });
  if (!canNudgeInvite(invite.status)) return;

  await prisma.shootInvite.update({ where: { id: inviteId }, data: { lastReminderSentAt: new Date() } });

  const shootLabel = invite.shoot.title ?? "your shoot";
  await sendPlainEmail({
    to: invite.membership.user.email,
    subject: `Reminder: RSVP for ${shootLabel}`,
    html: `<p>Hi ${invite.membership.user.name},</p><p>Just a reminder to respond to your invite for ${shootLabel}. Sign in to Callsheet to accept or decline.</p>`,
  });
}

/**
 * Removes a person from a shoot's roster. If they haven't responded yet,
 * there's no history worth keeping, so the slot and any pending invite are
 * deleted outright. If they already responded, the slot is soft-removed
 * (kept, marked removed) and the invite is left untouched so the historical
 * RSVP record survives (issue #9 acceptance criteria).
 */
export async function removePersonFromShoot(shootId: string, membershipId: string) {
  const [slots, invite] = await Promise.all([
    prisma.shootSlot.findMany({ where: { shootId, membershipId, removedAt: null } }),
    prisma.shootInvite.findUnique({ where: { shootId_membershipId: { shootId, membershipId } } }),
  ]);

  const outcome = removalOutcomeForInvite(invite?.status ?? null);

  if (outcome === "hard-delete") {
    await prisma.$transaction([
      prisma.shootSlot.deleteMany({ where: { id: { in: slots.map((s) => s.id) } } }),
      ...(invite ? [prisma.shootInvite.delete({ where: { id: invite.id } })] : []),
    ]);
  } else {
    await prisma.shootSlot.updateMany({
      where: { id: { in: slots.map((s) => s.id) } },
      data: { removedAt: new Date() },
    });
  }
}

export async function setCallTimeOverride(inviteId: string, shootDayId: string, callTime: string) {
  if (!callTime) {
    await prisma.callTimeOverride
      .delete({ where: { shootInviteId_shootDayId: { shootInviteId: inviteId, shootDayId } } })
      .catch(() => {}); // no override to clear — falling back to the day default is already the resting state
    return;
  }

  await prisma.callTimeOverride.upsert({
    where: { shootInviteId_shootDayId: { shootInviteId: inviteId, shootDayId } },
    create: { shootInviteId: inviteId, shootDayId, callTime },
    update: { callTime },
  });
}

// Same value scale as shoot-suggestions.ts's worst-day rule (issue #8) — unknown
// is a light penalty between OK and Unavailable, never treated as a red flag.
const TIER_VALUE: Record<Tier, number> = { best: 1, ok: 0.6, unavailable: 0 };
const UNKNOWN_VALUE = 0.4;

function tierValue(tier: Tier | null) {
  return tier === null ? UNKNOWN_VALUE : TIER_VALUE[tier];
}

/**
 * Availability ratio only, no roster — a Tentative shoot has no invites yet
 * (issue #9 acceptance criteria). Mirrors the suggestion algorithm's
 * worst-day rule (#8) for a person spanning multiple days of this shoot.
 */
export async function getTentativeAvailabilityRatio(shoot: {
  id: string;
  days: { date: Date; halfDay: "AM" | "PM" }[];
  slots: { membershipId: string | null; removedAt: Date | null }[];
}) {
  const membershipIds = [...new Set(shoot.slots.filter((s) => s.membershipId && !s.removedAt).map((s) => s.membershipId!))];
  if (membershipIds.length === 0 || shoot.days.length === 0) return { availableCount: 0, totalCount: 0 };

  const dates = shoot.days.map((d) => d.date);
  const windowStart = new Date(Math.min(...dates.map((d) => d.getTime())));
  const windowEnd = new Date(Math.max(...dates.map((d) => d.getTime())));

  let availableCount = 0;
  await Promise.all(
    membershipIds.map(async (membershipId) => {
      const { days } = await getAvailabilityCalendarData(membershipId, windowStart, windowEnd);
      const byDate = new Map(days.map((d) => [d.dateIso, d]));

      let worstTier: Tier | null = null;
      let worstValue = Infinity;
      for (const shootDay of shoot.days) {
        const cell = byDate.get(toIsoDate(shootDay.date));
        const tier = shootDay.halfDay === "AM" ? (cell?.am?.tier ?? null) : (cell?.pm?.tier ?? null);
        const value = tierValue(tier);
        if (value < worstValue) {
          worstValue = value;
          worstTier = tier;
        }
      }
      if (worstTier === "best" || worstTier === "ok") availableCount++;
    }),
  );

  return { availableCount, totalCount: membershipIds.length };
}
