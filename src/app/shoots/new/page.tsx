import { ShootPlanningWizard } from "@/components/shoots/shoot-planning-wizard";
import { getFilmCrew } from "@/server/shoot-planning";
import { requireActiveOrganiserFilm } from "@/server/organiser";

export default async function NewShootPage() {
  const { film } = await requireActiveOrganiserFilm();

  if (!film.dateRangeStart || !film.dateRangeEnd) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="font-display text-xl font-bold italic text-burgundy">No working dates yet</p>
        <p className="max-w-sm text-sm text-ink-soft">
          Set {film.name}&apos;s working dates in Film Settings before planning a shoot.
        </p>
      </div>
    );
  }

  const crew = await getFilmCrew(film.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display mb-1 text-2xl font-bold italic text-burgundy">Plan a shoot</h1>
      <p className="mb-6 text-[13px] text-ink-soft">{film.name}</p>
      <ShootPlanningWizard
        crew={crew.map((c) => ({ membershipId: c.id, name: c.user.name }))}
        windowStart={film.dateRangeStart.toISOString().slice(0, 10)}
        windowEnd={film.dateRangeEnd.toISOString().slice(0, 10)}
      />
    </div>
  );
}
