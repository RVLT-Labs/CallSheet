import { randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";
import type { Tier } from "@/lib/availability-tiers";
import { HALF_DAY_LABEL } from "@/lib/half-day";
import { getAvailabilityCalendarData } from "@/server/availability";
import { toIsoDate } from "@/server/availability-rules";
import { removalOutcomeForInvite, shouldNotifyShootChange, type InviteStatus } from "@/server/shoot-roster";
import { notifyConfirmedShootChange, sendInviteEmail, sendReminderEmail } from "@/server/shoot-invite-email";
import type { ChangeField } from "@/lib/email-templates";

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
 * shoot" means (issue #9 scope) — then sends each one its invite email with
 * a per-person .ics attachment and no-login accept/decline links (issue #10
 * scope).
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

  const created = await Promise.all(
    toCreate.map((membershipId) =>
      prisma.shootInvite.create({ data: { shootId, membershipId, token: generateInviteToken() } }),
    ),
  );

  await Promise.all(created.map((invite) => sendInviteEmail(invite.id)));
}

/** Tentative -> Confirmed is an explicit action distinct from creation (issue #9 acceptance criteria). */
export async function confirmShoot(shootId: string, organizationId: string) {
  const shoot = await prisma.shoot.findFirstOrThrow({ where: { id: shootId, filmId: organizationId } });
  if (shoot.status !== "tentative") return shoot;

  const updated = await prisma.shoot.update({ where: { id: shootId }, data: { status: "confirmed" } });
  await ensureInvitesForShoot(shootId);
  return updated;
}

export type UpdateShootDetailsInput = {
  title?: string;
  locationAddress?: string;
  locationMapUrl?: string;
  locationNotes?: string;
  notes?: string;
  dayCallTimes?: { dayId: string; defaultCallTime: string }[];
};

/**
 * Editing a Confirmed shoot's time or location must never be a silent
 * dashboard-only change (issue #10 acceptance criteria) — this diffs the
 * two fields that actually matter to someone already invited (location,
 * per-day call time; not title/map-link/notes, which are convenience
 * metadata) and fires a change-notification email + fresh .ics when either
 * one moves on an already-Confirmed shoot. A Tentative shoot has no invites
 * to notify either way.
 */
export async function updateShootDetails(shootId: string, organizationId: string, data: UpdateShootDetailsInput) {
  const before = await prisma.shoot.findFirst({
    where: { id: shootId, filmId: organizationId },
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

  await prisma.shoot.update({
    where: { id: shootId },
    data: {
      title: data.title !== undefined ? (data.title.trim() || null) : undefined,
      locationAddress: nextLocationAddress,
      locationMapUrl: data.locationMapUrl !== undefined ? (data.locationMapUrl.trim() || null) : undefined,
      locationNotes: data.locationNotes !== undefined ? (data.locationNotes.trim() || null) : undefined,
      notes: data.notes !== undefined ? (data.notes.trim() || null) : undefined,
    },
  });

  if (data.dayCallTimes) {
    const dayById = new Map(before.days.map((d) => [d.id, d]));
    for (const { dayId, defaultCallTime } of data.dayCallTimes) {
      const day = dayById.get(dayId);
      if (!day || day.defaultCallTime === defaultCallTime) continue;

      changes.push({
        label: `${toIsoDate(day.date)} ${HALF_DAY_LABEL[day.halfDay]} call time`,
        oldValue: day.defaultCallTime,
        newValue: defaultCallTime,
      });
      await prisma.shootDay.update({ where: { id: dayId }, data: { defaultCallTime } });
    }
  }

  if (shouldNotifyShootChange(before.status, changes.length)) {
    await notifyConfirmedShootChange(shootId, changes);
  }
}

/** Resends a reminder only to that one pending person (issue #9 acceptance criteria). */
export async function nudgeInvite(inviteId: string) {
  await sendReminderEmail(inviteId);
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

/**
 * Organiser-set RSVP status — deciding for someone who hasn't responded yet,
 * or overriding e.g. a Declined to Accepted. Same manual-overrides-recurring
 * precedence shape as availability (spec §10): this holds until the crew
 * member responds via their own accept/decline link, which always wins and
 * resets responseSource back to "crew" (see respondToInvite).
 */
export async function overrideInviteStatus(
  shootId: string,
  organizationId: string,
  inviteId: string,
  status: InviteStatus,
  overriddenByMembershipId: string,
) {
  const invite = await prisma.shootInvite.findFirst({
    where: { id: inviteId, shootId, shoot: { filmId: organizationId } },
  });
  if (!invite) return;

  await prisma.shootInvite.update({
    where: { id: invite.id },
    data: { status, responseSource: "organiser", overriddenByMembershipId, respondedAt: new Date() },
  });
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
