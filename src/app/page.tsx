import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { CrewToday, type CrewTodayItem } from "@/components/dashboard/crew-today";
import { OrganiserDashboard, type OrganiserDashboardItem } from "@/components/dashboard/organiser-dashboard";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardTour } from "@/components/onboarding/dashboard-tour";
import { FilmPicker } from "@/components/film-picker/film-picker";
import { LandingPage } from "@/components/marketing/landing-page";
import { NavShell } from "@/components/ui/nav-shell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrganiserUpcomingMeetings, getOrganiserUpcomingShoots } from "@/server/dashboard";
import { getMembershipsForUser } from "@/server/memberships";
import { getMyMeetingsData } from "@/server/my-meetings";
import { getMyShootsData } from "@/server/my-shoots";

function earliestDateIso(dateIsos: string[]) {
  return dateIsos[0] ?? "";
}

function byEarliestDate(a: { dateIsos: string[] }, b: { dateIsos: string[] }) {
  return earliestDateIso(a.dateIsos).localeCompare(earliestDateIso(b.dateIsos));
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tour?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return <LandingPage />;
  }

  const { active, wrapped } = await getMembershipsForUser(session.user.id);
  const activeOrganizationId = session.session.activeOrganizationId ?? null;
  const activeFilm = active.find((m) => m.organization.id === activeOrganizationId);

  // Safety net for invited crew who reach "/" with a film but no name yet
  // (accept-invitation-client.tsx routes them to /welcome directly, but
  // this covers any other path back here before that name is set).
  if (!session.user.name.trim() && (active.length > 0 || wrapped.length > 0)) {
    redirect("/welcome");
  }

  if (!activeFilm) {
    // Self-signup (no invite): zero films, never onboarded — collect their
    // name and get their first film made before dropping them here.
    if (active.length === 0 && wrapped.length === 0) {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: session.user.id },
        select: { onboardedAt: true },
      });
      if (!user.onboardedAt) redirect("/welcome");
    }

    return (
      <NavShell activeHref="/" user={{ id: session.user.id, name: session.user.name }} activeOrganizationId={activeOrganizationId} memberships={{ active, wrapped }}>
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
    const [upcomingShoots, upcomingMeetings] = await Promise.all([
      getOrganiserUpcomingShoots(film.id),
      getOrganiserUpcomingMeetings(film.id),
    ]);
    const upcoming: OrganiserDashboardItem[] = [
      ...upcomingShoots.map((shoot) => ({ ...shoot, kind: "shoot" as const })),
      ...upcomingMeetings.map((meeting) => ({ ...meeting, kind: "meeting" as const })),
    ]
      .sort(byEarliestDate)
      .slice(0, 6);
    const { tour } = await searchParams;

    return (
      <NavShell activeHref="/" user={{ id: session.user.id, name: session.user.name }} activeOrganizationId={activeOrganizationId} memberships={{ active, wrapped }}>
        <OrganiserDashboard filmName={film.name} upcoming={upcoming} />
        <AutoRefresh />
        {tour === "1" && <DashboardTour />}
      </NavShell>
    );
  }

  const membership = await prisma.member.findUniqueOrThrow({
    where: { organizationId_userId: { organizationId: film.id, userId: session.user.id } },
  });
  const [{ upcoming: upcomingShoots }, { upcoming: upcomingMeetings }] = await Promise.all([
    getMyShootsData(membership.id, film.id, film.showTentativeToCrew),
    getMyMeetingsData(membership.id, film.id, film.showTentativeToCrew),
  ]);
  const upcoming: CrewTodayItem[] = [
    ...upcomingShoots.map((shoot) => ({ ...shoot, kind: "shoot" as const })),
    ...upcomingMeetings.map((meeting) => ({ ...meeting, kind: "meeting" as const })),
  ].sort(byEarliestDate);

  return (
    <NavShell activeHref="/" user={{ id: session.user.id, name: session.user.name }} activeOrganizationId={activeOrganizationId} memberships={{ active, wrapped }}>
      <CrewToday filmName={film.name} upcoming={upcoming.slice(0, 5)} />
    </NavShell>
  );
}
