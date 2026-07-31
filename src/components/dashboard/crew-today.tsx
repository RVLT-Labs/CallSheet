import Link from "next/link";

import { DayStrip } from "@/components/dashboard/day-strip";
import { PageShell } from "@/components/ui/page-shell";
import { StatusDot } from "@/components/ui/status-dot";
import { NOTHING_SCHEDULED_COPY } from "@/lib/my-shoots-rules";
import type { MyShoot } from "@/server/my-shoots";
import type { MyMeeting } from "@/server/my-meetings";
import { inviteStatusLabel } from "@/server/invite-roster";

export type CrewTodayItem =
  | (MyShoot & { kind: "shoot" })
  | (MyMeeting & { kind: "meeting" });

const INVITE_TONE = { accepted: "forest", declined: "burgundy", pending: "taupe" } as const;
const KIND_LABEL: Record<CrewTodayItem["kind"], string> = { shoot: "Shoot", meeting: "Meeting" };
const KIND_HREF_PREFIX: Record<CrewTodayItem["kind"], string> = { shoot: "/shoots", meeting: "/meetings" };

function dateLabel(dateIsos: string[]) {
  if (dateIsos.length === 0) return "No date set";
  if (dateIsos.length === 1) return dateIsos[0];
  return `${dateIsos[0]} – ${dateIsos[dateIsos.length - 1]}`;
}

/** Crew home (issue #11 scope): day strip + upcoming shoots/meetings as flat rows, no card-heavy list. */
export function CrewToday({ filmName, upcoming }: { filmName: string; upcoming: CrewTodayItem[] }) {
  const markedDateIsos = new Set(upcoming.flatMap((item) => item.dateIsos));

  return (
    <PageShell maxWidth="max-w-7xl">
      <p className="mb-1 text-[13px] text-ink-soft">{filmName}</p>
      <h1 className="mb-8 font-display text-2xl font-bold italic text-burgundy md:text-3xl">Today</h1>

      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:items-start lg:gap-10">
        <div>
          <DayStrip markedDateIsos={markedDateIsos} />

          <div className="mt-8">
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Upcoming</p>
            {upcoming.length === 0 && <p className="text-[13px] text-ink-soft">{NOTHING_SCHEDULED_COPY}</p>}
            {upcoming.map((item) => (
              <Link
                key={`${item.kind}-${item.id}`}
                href={`${KIND_HREF_PREFIX[item.kind]}/${item.id}`}
                className="flex items-center justify-between border-b border-hairline py-3 last:border-b-0"
              >
                <div>
                  <p className="text-[13.5px] font-medium">
                    <span className="mr-1.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
                      {KIND_LABEL[item.kind]}
                    </span>
                    {item.title ?? KIND_LABEL[item.kind]}
                  </p>
                  <p className="text-[12px] text-ink-soft">{dateLabel(item.dateIsos)}</p>
                </div>
                {item.status === "tentative" ? (
                  <span className="text-[12px] italic text-terracotta">Hold, not booked</span>
                ) : item.inviteStatus ? (
                  <StatusDot
                    tone={INVITE_TONE[item.inviteStatus]}
                    label={inviteStatusLabel(item.inviteStatus, item.inviteResponseSource ?? "crew")}
                  />
                ) : null}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-md border border-hairline bg-white p-4 lg:mt-0">
          <p className="mb-3 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Quick actions</p>
          <div className="flex flex-col gap-2.5">
            <Link href="/availability" className="text-[13px] font-semibold text-burgundy">
              My availability
            </Link>
            <Link href="/shoots" className="text-[13px] font-semibold text-burgundy">
              My Shoots
            </Link>
            <Link href="/meetings" className="text-[13px] font-semibold text-burgundy">
              My Meetings
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
