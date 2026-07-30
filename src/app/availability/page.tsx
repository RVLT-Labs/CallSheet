import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AvailabilityCalendar } from "@/components/availability/availability-calendar";
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
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="font-display text-xl font-bold italic text-burgundy">No working dates yet</p>
        <p className="max-w-sm text-sm text-ink-soft">
          Ask an organiser to set {film.name}&apos;s working dates in Film Settings before entering
          availability.
        </p>
      </div>
    );
  }

  const { days, rules } = await getAvailabilityCalendarData(
    membership.id,
    film.dateRangeStart,
    film.dateRangeEnd,
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
      <h1 className="font-display mb-1 text-2xl font-bold italic text-burgundy">Your availability</h1>
      <p className="mb-6 text-[13px] text-ink-soft">
        {film.name} · {film.dateRangeStart.toISOString().slice(0, 10)} to{" "}
        {film.dateRangeEnd.toISOString().slice(0, 10)}
      </p>
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
    </div>
  );
}
