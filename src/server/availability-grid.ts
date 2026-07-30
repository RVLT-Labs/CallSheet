import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvailabilityCalendarData, type DayCell } from "@/server/availability";

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

  return Promise.all(
    members.map(async (member) => {
      const { days } = await getAvailabilityCalendarData(member.id, windowStart, windowEnd);
      return { membershipId: member.id, name: member.user.name, roleTags: member.roleTags, days };
    }),
  );
}

export async function requireActiveOrganiserFilm() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) redirect("/");

  const [film, membership] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    prisma.member.findUnique({
      where: { organizationId_userId: { organizationId, userId: session.user.id } },
    }),
  ]);

  if (!membership || membership.role === "member") redirect("/");

  return { session, organizationId, film };
}
