import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { ProportionBar } from "@/components/ui/proportion-bar";
import { StatusDot } from "@/components/ui/status-dot";
import type { OrganiserDashboardShoot } from "@/server/dashboard";

function dateLabel(dateIsos: string[]) {
  if (dateIsos.length === 0) return "No date set";
  if (dateIsos.length === 1) return dateIsos[0];
  return `${dateIsos[0]} – ${dateIsos[dateIsos.length - 1]}`;
}

/** Organiser home (issue #11 scope): upcoming shoots + RSVP roster per shoot, quick links to availability. */
export function OrganiserDashboard({
  filmName,
  upcoming,
}: {
  filmName: string;
  upcoming: OrganiserDashboardShoot[];
}) {
  return (
    <PageShell maxWidth="max-w-7xl">
      <p className="mb-1 text-[13px] text-ink-soft">{filmName}</p>
      <h1 className="mb-8 font-display text-2xl font-bold italic text-burgundy md:text-3xl">Dashboard</h1>

      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:items-start lg:gap-10">
        <div>
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

        <div className="mt-8 rounded-md border border-hairline bg-white p-4 lg:mt-0">
          <p className="mb-3 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Quick actions</p>
          <div className="flex flex-col gap-2.5">
            <Link href="/availability" className="text-[13px] font-semibold text-burgundy">
              My availability
            </Link>
            <Link href="/availability/grid" className="text-[13px] font-semibold text-burgundy">
              Crew availability grid
            </Link>
          </div>
          <Button href="/shoots/new" variant="primary" className="mt-4 block w-full text-center">
            Plan a shoot
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
