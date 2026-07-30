import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ShootSlotSwap } from "@/components/shoots/shoot-slot-swap";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFilmCrew } from "@/server/shoot-planning";
import { getFilmShoots } from "@/server/shoots-list";

export default async function ShootsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) redirect("/");

  const membership = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId, userId: session.user.id } },
  });
  if (!membership) redirect("/");

  const isOrganiser = membership.role !== "member";
  const [shoots, crew] = await Promise.all([
    getFilmShoots(organizationId),
    isOrganiser ? getFilmCrew(organizationId) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold italic text-burgundy">Shoots</h1>
        {isOrganiser && <Button href="/shoots/new">Plan a shoot</Button>}
      </div>

      {shoots.length === 0 && (
        <p className="text-[13px] text-ink-soft">
          {isOrganiser
            ? "No shoots yet. Plan one once your crew has entered their availability."
            : "Nothing scheduled yet."}
        </p>
      )}

      {shoots.map((shoot) => {
        const dates = [...new Set(shoot.days.map((d) => d.date.toISOString().slice(0, 10)))];
        const requiredSlots = shoot.slots.filter((s) => s.kind === "required");
        const generalSlots = shoot.slots.filter((s) => s.kind === "general");

        return (
          <div key={shoot.id} className="border-b border-hairline py-4">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[14px] font-semibold">
                {dates.length === 1 ? dates[0] : `${dates[0]} – ${dates[dates.length - 1]}`}
              </p>
              <StatusDot
                tone={shoot.status === "confirmed" ? "forest" : "terracotta"}
                label={shoot.status === "confirmed" ? "Confirmed" : "Tentative"}
              />
            </div>
            <p className="mb-2 text-[12px] text-ink-soft">
              {requiredSlots.length} required · {generalSlots.length} general
            </p>

            {isOrganiser &&
              [...requiredSlots, ...generalSlots]
                .filter((slot) => !slot.membershipId)
                .map((slot) => (
                  <ShootSlotSwap key={slot.id} slotId={slot.id} label={slot.placeholderLabel ?? ""} crew={crew.map((c) => ({ membershipId: c.id, name: c.user.name }))} />
                ))}
          </div>
        );
      })}

      <p className="mt-4 text-[11px] italic text-ink-faint">
        Shoot detail, RSVP roster, and invite emails land in issues #9 and #10.
      </p>
    </div>
  );
}
