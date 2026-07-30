import { prisma } from "@/lib/prisma";
import { majorityTier } from "@/lib/heatmap";
import { toIsoDate, parseIsoDateUtc } from "@/server/availability-rules";
import { getAggregateAvailability } from "@/server/availability-grid";
import { countRsvpStatuses } from "@/server/shoot-roster";

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

export type HeatmapDay = { dateIso: string; am: "best" | "ok" | "unavailable" | null; pm: "best" | "ok" | "unavailable" | null };

/**
 * A condensed, non-interactive summary of the full aggregate grid (#7) — one
 * majority tier per half-day across the whole crew, for a dashboard glance.
 * The full per-person breakdown stays at /availability/grid.
 */
export async function getAvailabilityHeatmapSummary(
  organizationId: string,
  filmWindowStart: Date,
  filmWindowEnd: Date,
  numDays = 10,
): Promise<HeatmapDay[]> {
  const todayIso = toIsoDate(new Date());
  const windowStart = parseIsoDateUtc(todayIso) < filmWindowStart ? filmWindowStart : parseIsoDateUtc(todayIso);
  if (windowStart > filmWindowEnd) return [];

  const windowEndCandidate = new Date(windowStart.getTime() + (numDays - 1) * 86_400_000);
  const windowEnd = windowEndCandidate > filmWindowEnd ? filmWindowEnd : windowEndCandidate;

  const rows = await getAggregateAvailability(organizationId, windowStart, windowEnd);

  const days: HeatmapDay[] = [];
  for (let d = new Date(windowStart); d <= windowEnd; d = new Date(d.getTime() + 86_400_000)) {
    const dateIso = toIsoDate(d);
    const amTiers = rows.map((r) => r.days.find((day) => day.dateIso === dateIso)?.am?.tier ?? null);
    const pmTiers = rows.map((r) => r.days.find((day) => day.dateIso === dateIso)?.pm?.tier ?? null);
    days.push({ dateIso, am: majorityTier(amTiers), pm: majorityTier(pmTiers) });
  }

  return days;
}
