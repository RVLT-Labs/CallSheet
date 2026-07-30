import Link from "next/link";

import { HeatmapSummary } from "@/components/dashboard/heatmap-summary";
import { ProportionBar } from "@/components/ui/proportion-bar";
import { StatusDot } from "@/components/ui/status-dot";
import type { HeatmapDay, OrganiserDashboardShoot } from "@/server/dashboard";

function dateLabel(dateIsos: string[]) {
  if (dateIsos.length === 0) return "No date set";
  if (dateIsos.length === 1) return dateIsos[0];
  return `${dateIsos[0]} – ${dateIsos[dateIsos.length - 1]}`;
}

/** Organiser home (issue #11 scope): upcoming shoots + RSVP roster per shoot, crew availability at a glance. */
export function OrganiserDashboard({
  filmName,
  upcoming,
  heatmapDays,
}: {
  filmName: string;
  upcoming: OrganiserDashboardShoot[];
  heatmapDays: HeatmapDay[];
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
      <p className="mb-1 text-[13px] text-ink-soft">{filmName}</p>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold italic text-burgundy">Dashboard</h1>
        <Link href="/availability" className="text-[12.5px] font-semibold text-burgundy">
          My availability
        </Link>
      </div>

      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Crew availability</p>
      <div className="mb-8">
        <HeatmapSummary days={heatmapDays} />
      </div>

      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Upcoming shoots</p>
      {upcoming.length === 0 && (
        <p className="text-[13px] text-ink-soft">No shoots yet. Plan one once your crew has entered their availability.</p>
      )}
      {upcoming.map((shoot) => (
        <Link key={shoot.id} href={`/shoots/${shoot.id}`} className="block border-b border-hairline py-3.5 last:border-b-0">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[14px] font-semibold">{shoot.title ?? "Shoot"}</p>
            <StatusDot
              tone={shoot.status === "confirmed" ? "forest" : "terracotta"}
              label={shoot.status === "confirmed" ? "Confirmed" : "Tentative"}
            />
          </div>
          <p className="mb-2 text-[12px] text-ink-soft">{dateLabel(shoot.dateIsos)}</p>
          {shoot.rsvp && (
            <ProportionBar
              showLegend={false}
              segments={[
                { tone: "forest", label: "Accepted", count: shoot.rsvp.accepted },
                { tone: "burgundy", label: "Declined", count: shoot.rsvp.declined },
                { tone: "taupe", label: "Pending", count: shoot.rsvp.pending },
              ]}
            />
          )}
        </Link>
      ))}

      <Link href="/shoots" className="mt-4 inline-block text-[12.5px] font-semibold text-burgundy">
        See all shoots
      </Link>
    </div>
  );
}
