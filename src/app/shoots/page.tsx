import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { MyShoots } from "@/components/shoots/my-shoots";
import { ShootsList, type ShootListItem } from "@/components/shoots/shoots-list";
import { Button } from "@/components/ui/button";
import { NavShell } from "@/components/ui/nav-shell";
import { PageShell } from "@/components/ui/page-shell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMembershipsForUser } from "@/server/memberships";
import { getMyShootsData } from "@/server/my-shoots";
import { getFilmCrew } from "@/server/shoot-planning";
import { getFilmShoots } from "@/server/shoots-list";

export default async function ShootsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) redirect("/");

  // Kicked off alongside the queries below, not awaited here, so NavShell's
  // fetch overlaps with the rest of the page's data instead of running after it.
  const membershipsPromise = getMembershipsForUser(session.user.id);

  const [film, membership] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    prisma.member.findUnique({
      where: { organizationId_userId: { organizationId, userId: session.user.id } },
    }),
  ]);
  if (!membership) redirect("/");

  const isOrganiser = membership.role !== "member";

  if (!isOrganiser) {
    const { upcoming, past } = await getMyShootsData(membership.id, organizationId, film.showTentativeToCrew);
    return (
      <NavShell activeHref="/shoots" user={{ id: session.user.id, name: session.user.name }} activeOrganizationId={organizationId} memberships={membershipsPromise}>
        <MyShoots upcoming={upcoming} past={past} />
      </NavShell>
    );
  }

  const [shoots, crew] = await Promise.all([getFilmShoots(organizationId), getFilmCrew(organizationId)]);

  return (
    <NavShell activeHref="/shoots" user={{ id: session.user.id, name: session.user.name }} activeOrganizationId={organizationId} memberships={membershipsPromise}>
      <PageShell maxWidth="max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold italic text-burgundy md:text-3xl">Shoots</h1>
          <Button href="/shoots/new">Plan a shoot</Button>
        </div>

        {shoots.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <p className="font-display text-xl font-bold italic text-burgundy">Nothing on the schedule yet</p>
            <p className="max-w-sm text-sm text-ink-soft">
              Once your crew has some availability in, Plan a shoot will find dates that actually work for
              everyone.
            </p>
          </div>
        )}

        {shoots.length > 0 && (
          <ShootsList
            shoots={shoots.map((shoot): ShootListItem => {
              const activeSlots = shoot.slots.filter((s) => !s.removedAt);
              return {
                id: shoot.id,
                title: shoot.title,
                status: shoot.status,
                dateIsos: [...new Set(shoot.days.map((d) => d.date.toISOString().slice(0, 10)))].sort(),
                requiredCount: activeSlots.filter((s) => s.kind === "required").length,
                generalCount: activeSlots.filter((s) => s.kind === "general").length,
                placeholderSlots: activeSlots
                  .filter((s) => !s.membershipId)
                  .map((s) => ({ id: s.id, label: s.placeholderLabel ?? "" })),
              };
            })}
            crew={crew.map((c) => ({ membershipId: c.id, name: c.user.name }))}
          />
        )}
      </PageShell>
    </NavShell>
  );
}
