import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MyShoots } from "@/components/shoots/my-shoots";
import { ShootSlotSwap } from "@/components/shoots/shoot-slot-swap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NavShell } from "@/components/ui/nav";
import { PageShell } from "@/components/ui/page-shell";
import { StatusDot } from "@/components/ui/status-dot";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyShootsData } from "@/server/my-shoots";
import { getFilmCrew } from "@/server/shoot-planning";
import { getFilmShoots } from "@/server/shoots-list";

export default async function ShootsPage() {
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

  const isOrganiser = membership.role !== "member";

  if (!isOrganiser) {
    const { pending, upcoming, past } = await getMyShootsData(membership.id, organizationId, film.showTentativeToCrew);
    return (
      <NavShell activeHref="/shoots">
        <MyShoots pending={pending} upcoming={upcoming} past={past} />
      </NavShell>
    );
  }

  const [shoots, crew] = await Promise.all([getFilmShoots(organizationId), getFilmCrew(organizationId)]);

  return (
    <NavShell activeHref="/shoots">
      <PageShell maxWidth="max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold italic text-burgundy md:text-3xl">Shoots</h1>
          <Button href="/shoots/new">Plan a shoot</Button>
        </div>

        {shoots.length === 0 && (
          <p className="text-[13px] text-ink-soft">No shoots yet. Plan one once your crew has entered their availability.</p>
        )}

        <div className="md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3">
          {shoots.map((shoot) => {
            const dates = [...new Set(shoot.days.map((d) => d.date.toISOString().slice(0, 10)))];
            const activeSlots = shoot.slots.filter((s) => !s.removedAt);
            const requiredSlots = activeSlots.filter((s) => s.kind === "required");
            const generalSlots = activeSlots.filter((s) => s.kind === "general");

            return (
              <div key={shoot.id} className="mb-4 last:mb-0 md:mb-0">
                <Card>
                  <Link href={`/shoots/${shoot.id}`} className="mb-1.5 flex items-center justify-between">
                    <p className="text-[14px] font-semibold">
                      {shoot.title ?? (dates.length === 1 ? dates[0] : `${dates[0]} – ${dates[dates.length - 1]}`)}
                    </p>
                    <StatusDot
                      tone={shoot.status === "confirmed" ? "forest" : "terracotta"}
                      label={shoot.status === "confirmed" ? "Confirmed" : "Tentative"}
                    />
                  </Link>
                  <p className="mb-2 text-[12px] text-ink-soft">
                    {requiredSlots.length} required · {generalSlots.length} general
                  </p>

                  {[...requiredSlots, ...generalSlots]
                    .filter((slot) => !slot.membershipId)
                    .map((slot) => (
                      <ShootSlotSwap
                        key={slot.id}
                        slotId={slot.id}
                        label={slot.placeholderLabel ?? ""}
                        crew={crew.map((c) => ({ membershipId: c.id, name: c.user.name }))}
                      />
                    ))}
                </Card>
              </div>
            );
          })}
        </div>
      </PageShell>
    </NavShell>
  );
}
