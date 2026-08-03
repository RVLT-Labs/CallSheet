import { MeetingPlanningWizard } from "@/components/meetings/meeting-planning-wizard";
import { NavShell } from "@/components/ui/nav-shell";
import { getFilmCrew } from "@/server/shoot-planning";
import { requireActiveOrganiserFilm } from "@/server/organiser";

export default async function NewMeetingPage() {
  const { session, organizationId, film, membershipsPromise } = await requireActiveOrganiserFilm();

  if (!film.dateRangeStart || !film.dateRangeEnd) {
    return (
      <NavShell
        activeHref="/meetings"
        user={{ id: session.user.id, name: session.user.name }}
        activeOrganizationId={organizationId}
        memberships={membershipsPromise}
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="font-display text-xl font-bold italic text-burgundy">No working dates yet</p>
          <p className="max-w-sm text-sm text-ink-soft">
            Set {film.name}&apos;s working dates in Film Settings before planning a meeting.
          </p>
        </div>
      </NavShell>
    );
  }

  const crew = await getFilmCrew(film.id);

  return (
    <NavShell
      activeHref="/meetings"
      user={{ id: session.user.id, name: session.user.name }}
      activeOrganizationId={organizationId}
      memberships={membershipsPromise}
    >
      <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8">
        <h1 className="font-display mb-1 text-2xl font-bold italic text-burgundy">Plan a meeting</h1>
        <p className="mb-6 text-[13px] text-ink-soft">{film.name}</p>
        <MeetingPlanningWizard
          crew={crew.map((c) => ({ membershipId: c.id, name: c.user.name }))}
          windowStart={film.dateRangeStart.toISOString().slice(0, 10)}
          windowEnd={film.dateRangeEnd.toISOString().slice(0, 10)}
        />
      </div>
    </NavShell>
  );
}
