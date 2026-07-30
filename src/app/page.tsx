import { headers } from "next/headers";
import Link from "next/link";

import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { CrewToday } from "@/components/dashboard/crew-today";
import { OrganiserDashboard } from "@/components/dashboard/organiser-dashboard";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { FilmPicker } from "@/components/film-picker/film-picker";
import { LandingPage } from "@/components/marketing/landing-page";
import { NavShell } from "@/components/ui/nav-shell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrganiserUpcomingShoots } from "@/server/dashboard";
import { getMembershipsForUser } from "@/server/memberships";
import { getMyShootsData } from "@/server/my-shoots";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return <LandingPage />;
  }

  const { active, wrapped } = await getMembershipsForUser(session.user.id);
  const activeOrganizationId = session.session.activeOrganizationId ?? null;
  const activeFilm = active.find((m) => m.organization.id === activeOrganizationId);

  if (!activeFilm) {
    return (
      <NavShell activeHref="/" user={{ id: session.user.id, name: session.user.name }} activeOrganizationId={activeOrganizationId}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <FilmPicker
            active={active}
            wrapped={wrapped}
            activeOrganizationId={activeOrganizationId}
            activeFilmName="Callsheet"
          />
          <p className="max-w-sm text-sm text-ink-soft">
            {active.length === 0 ? "Pick a film to get started." : "Pick a film above to see its schedule."}
          </p>
          <div className="flex items-center gap-4">
            <Link href="/profile" className="text-[13px] font-semibold text-burgundy">
              Edit profile
            </Link>
            <SignOutButton />
          </div>
        </div>
      </NavShell>
    );
  }

  const film = await prisma.organization.findUniqueOrThrow({ where: { id: activeFilm.organization.id } });
  const isOrganiser = activeFilm.role !== "member";

  if (isOrganiser) {
    const upcoming = await getOrganiserUpcomingShoots(film.id);

    return (
      <NavShell activeHref="/" user={{ id: session.user.id, name: session.user.name }} activeOrganizationId={activeOrganizationId}>
        <OrganiserDashboard filmName={film.name} upcoming={upcoming} />
        <AutoRefresh />
      </NavShell>
    );
  }

  const membership = await prisma.member.findUniqueOrThrow({
    where: { organizationId_userId: { organizationId: film.id, userId: session.user.id } },
  });
  const { upcoming } = await getMyShootsData(membership.id, film.id, film.showTentativeToCrew);

  return (
    <NavShell activeHref="/" user={{ id: session.user.id, name: session.user.name }} activeOrganizationId={activeOrganizationId}>
      <CrewToday filmName={film.name} upcoming={upcoming.slice(0, 5)} />
    </NavShell>
  );
}
