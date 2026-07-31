import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { ProportionBar } from "@/components/ui/proportion-bar";
import { StatusDot } from "@/components/ui/status-dot";
import type { OrganiserDashboardMeeting, OrganiserDashboardShoot } from "@/server/dashboard";

export type OrganiserDashboardItem =
  | (OrganiserDashboardShoot & { kind: "shoot" })
  | (OrganiserDashboardMeeting & { kind: "meeting" });

function dateLabel(dateIsos: string[]) {
  if (dateIsos.length === 0) return "No date set";
  if (dateIsos.length === 1) return dateIsos[0];
  return `${dateIsos[0]} – ${dateIsos[dateIsos.length - 1]}`;
}

const KIND_LABEL: Record<OrganiserDashboardItem["kind"], string> = { shoot: "Shoot", meeting: "Meeting" };
const KIND_HREF_PREFIX: Record<OrganiserDashboardItem["kind"], string> = { shoot: "/shoots", meeting: "/meetings" };

/** Organiser home (issue #11 scope): upcoming shoots + meetings, merged and sorted by date, quick links to availability. */
export function OrganiserDashboard({
  filmName,
  upcoming,
}: {
  filmName: string;
  upcoming: OrganiserDashboardItem[];
}) {
  return (
    <PageShell maxWidth="max-w-7xl">
      <p className="mb-1 text-[13px] text-ink-soft">{filmName}</p>
      <h1 className="mb-8 font-display text-2xl font-bold italic text-burgundy md:text-3xl">Dashboard</h1>

      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:items-start lg:gap-10">
        <div>
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Upcoming</p>
          {upcoming.length === 0 && (
            <p className="text-[13px] text-ink-soft">Nothing yet. Plan a shoot or meeting once your crew has entered their availability.</p>
          )}
          {upcoming.map((item) => (
            <Link
              key={`${item.kind}-${item.id}`}
              href={`${KIND_HREF_PREFIX[item.kind]}/${item.id}`}
              className="block border-b border-hairline py-3.5 last:border-b-0"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[14px] font-semibold">
                  <span className="mr-1.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
                    {KIND_LABEL[item.kind]}
                  </span>
                  {item.title ?? KIND_LABEL[item.kind]}
                </p>
                <StatusDot
                  tone={item.status === "confirmed" ? "forest" : "terracotta"}
                  label={item.status === "confirmed" ? "Confirmed" : "Tentative"}
                />
              </div>
              <p className="mb-2 text-[12px] text-ink-soft">{dateLabel(item.dateIsos)}</p>
              {item.rsvp && (
                <ProportionBar
                  showLegend={false}
                  segments={[
                    { tone: "forest", label: "Accepted", count: item.rsvp.accepted },
                    { tone: "burgundy", label: "Declined", count: item.rsvp.declined },
                    { tone: "taupe", label: "Pending", count: item.rsvp.pending },
                  ]}
                />
              )}
            </Link>
          ))}

          <div className="mt-4 flex gap-4">
            <Link href="/shoots" className="inline-block text-[12.5px] font-semibold text-burgundy">
              See all shoots
            </Link>
            <Link href="/meetings" className="inline-block text-[12.5px] font-semibold text-burgundy">
              See all meetings
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-md border border-hairline bg-white p-4 lg:mt-0">
          <p className="mb-3 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Quick actions</p>
          <div className="flex flex-col gap-2.5">
            <Link href="/availability" className="text-[13px] font-semibold text-burgundy">
              My availability
            </Link>
            <Link href="/availability/grid" data-tour="quick-crew-grid" className="text-[13px] font-semibold text-burgundy">
              Crew availability grid
            </Link>
          </div>
          <Button
            href="/shoots/new"
            variant="primary"
            data-tour="quick-plan-shoot"
            className="mt-4 block w-full text-center"
          >
            Plan a shoot
          </Button>
          <Button href="/meetings/new" variant="secondary" className="mt-2.5 block w-full text-center">
            Plan a meeting
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
