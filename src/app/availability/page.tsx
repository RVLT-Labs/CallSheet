import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AvailabilityCalendar } from "@/components/availability/availability-calendar";
import { NavShell } from "@/components/ui/nav-shell";
import { PageShell } from "@/components/ui/page-shell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvailabilityCalendarData } from "@/server/availability";

export default async function AvailabilityPage() {
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

  if (!membership) redirect("/");

  if (!film.dateRangeStart || !film.dateRangeEnd) {
    return (
      <NavShell activeHref="/availability" user={{ id: session.user.id, name: session.user.name }} activeOrganizationId={organizationId}>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="font-display text-xl font-bold italic text-burgundy">No working dates yet</p>
          <p className="max-w-sm text-sm text-ink-soft">
            Ask an organiser to set {film.name}&apos;s working dates in Film Settings before entering
            availability.
          </p>
        </div>
      </NavShell>
    );
  }

  const { days, rules } = await getAvailabilityCalendarData(
    membership.id,
    film.dateRangeStart,
    film.dateRangeEnd,
  );

  return (
    <NavShell activeHref="/availability" user={{ id: session.user.id, name: session.user.name }} activeOrganizationId={organizationId}>
      <PageShell maxWidth="max-w-5xl">
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h1 className="font-display mb-1 text-2xl font-bold italic text-burgundy md:text-3xl">Your availability</h1>
            <p className="text-[13px] text-ink-soft">
              {film.name} · {film.dateRangeStart.toISOString().slice(0, 10)} to{" "}
              {film.dateRangeEnd.toISOString().slice(0, 10)}
            </p>
          </div>
          {membership.role !== "member" && (
            <Link href="/availability/grid" className="text-[13px] font-semibold text-burgundy">
              Crew availability grid
            </Link>
          )}
        </div>
        <AvailabilityCalendar
          windowStart={film.dateRangeStart.toISOString().slice(0, 10)}
          windowEnd={film.dateRangeEnd.toISOString().slice(0, 10)}
          days={days}
          rules={rules.map((r) => ({
            id: r.id,
            dayOfWeek: r.dayOfWeek,
            halfDay: r.halfDay,
            tier: r.tier,
            label: r.label,
            effectiveStart: r.effectiveStart.toISOString().slice(0, 10),
            effectiveEnd: r.effectiveEnd ? r.effectiveEnd.toISOString().slice(0, 10) : null,
          }))}
        />
      </PageShell>
    </NavShell>
  );
}
