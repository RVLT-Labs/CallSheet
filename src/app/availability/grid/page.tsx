import { AvailabilityGrid } from "@/components/availability/availability-grid";
import { NavShell } from "@/components/ui/nav";
import { PageShell } from "@/components/ui/page-shell";
import { getAggregateAvailability } from "@/server/availability-grid";
import { requireActiveOrganiserFilm } from "@/server/organiser";

export default async function AvailabilityGridPage({
  searchParams,
}: {
  searchParams: Promise<{ required?: string }>;
}) {
  const { session, film } = await requireActiveOrganiserFilm();
  const { required } = await searchParams;
  const requiredMembershipIds = required ? required.split(",").filter(Boolean) : [];

  if (!film.dateRangeStart || !film.dateRangeEnd) {
    return (
      <NavShell activeHref="/availability" user={{ name: session.user.name }}>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="font-display text-xl font-bold italic text-burgundy">No working dates yet</p>
          <p className="max-w-sm text-sm text-ink-soft">
            Set {film.name}&apos;s working dates in Film Settings before viewing crew availability.
          </p>
        </div>
      </NavShell>
    );
  }

  const crew = await getAggregateAvailability(film.id, film.dateRangeStart, film.dateRangeEnd);

  return (
    <NavShell activeHref="/availability" user={{ name: session.user.name }}>
      <PageShell maxWidth="max-w-7xl">
        <h1 className="font-display mb-1 text-2xl font-bold italic text-burgundy md:text-3xl">Crew availability</h1>
        <p className="mb-6 text-[13px] text-ink-soft">
          {film.name} · {film.dateRangeStart.toISOString().slice(0, 10)} to{" "}
          {film.dateRangeEnd.toISOString().slice(0, 10)}
        </p>
        <AvailabilityGrid
          crew={crew}
          windowStart={film.dateRangeStart.toISOString().slice(0, 10)}
          windowEnd={film.dateRangeEnd.toISOString().slice(0, 10)}
          requiredMembershipIds={requiredMembershipIds}
        />
      </PageShell>
    </NavShell>
  );
}
