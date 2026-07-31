import { prisma } from "@/lib/prisma";
import { toIsoDate } from "@/server/availability-rules";
import { countRsvpStatuses } from "@/server/invite-roster";

export type OrganiserDashboardShoot = {
  id: string;
  title: string | null;
  status: "tentative" | "confirmed";
  dateIsos: string[];
  rsvp: { accepted: number; declined: number; pending: number } | null; // null for Tentative — no invites exist yet
};

/** Upcoming (today or later) shoots for the organiser dashboard glance, soonest first. */
export async function getOrganiserUpcomingShoots(organizationId: string, limit = 6): Promise<OrganiserDashboardShoot[]> {
  const todayIso = toIsoDate(new Date());

  const shoots = await prisma.shoot.findMany({
    where: { filmId: organizationId },
    include: { days: { orderBy: { date: "asc" } }, invites: { select: { status: true } } },
  });

  const upcoming = shoots
    .map((shoot) => {
      const dateIsos = [...new Set(shoot.days.map((d) => toIsoDate(d.date)))].sort();
      return {
        id: shoot.id,
        title: shoot.title,
        status: shoot.status,
        dateIsos,
        rsvp: shoot.status === "confirmed" ? countRsvpStatuses(shoot.invites) : null,
      };
    })
    .filter((s) => s.dateIsos.length === 0 || s.dateIsos[s.dateIsos.length - 1] >= todayIso)
    .sort((a, b) => (a.dateIsos[0] ?? "").localeCompare(b.dateIsos[0] ?? ""));

  return upcoming.slice(0, limit);
}
