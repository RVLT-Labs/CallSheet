import { prisma } from "@/lib/prisma";
import { getAvailabilityCalendarDataBatch, type DayCell } from "@/server/availability";

export type CrewAvailabilityRow = {
  membershipId: string;
  name: string;
  roleTags: string[];
  days: DayCell[];
};

/**
 * One row per crew member, reusing the same per-membership resolution used by
 * the crew's own calendar (issue #6) — the grid never re-derives manual-vs-
 * recurring precedence itself, it just reads the resolved Availability rows.
 */
export async function getAggregateAvailability(
  organizationId: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<CrewAvailabilityRow[]> {
  const members = await prisma.member.findMany({
    where: { organizationId },
    select: { id: true, roleTags: true, user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const calendarByMembership = await getAvailabilityCalendarDataBatch(
    members.map((m) => m.id),
    windowStart,
    windowEnd,
  );

  return members.map((member) => ({
    membershipId: member.id,
    name: member.user.name,
    roleTags: member.roleTags,
    days: calendarByMembership.get(member.id)?.days ?? [],
  }));
}
