import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { NavShell } from "@/components/ui/nav-shell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toIsoDate } from "@/server/availability-rules";
import { getShootDetail, getTentativeAvailabilityRatio } from "@/server/shoot-detail";

import { ShootDetailView } from "@/components/shoots/shoot-detail-view";

export default async function ShootDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) redirect("/");

  const membership = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId, userId: session.user.id } },
  });
  if (!membership) redirect("/");

  const shoot = await getShootDetail(id, organizationId);
  if (!shoot) notFound();

  const isOrganiser = membership.role !== "member";

  const activeSlots = shoot.slots.filter((s) => !s.removedAt);
  const removedSlots = shoot.slots.filter((s) => s.removedAt);

  const tentativeRatio =
    shoot.status === "tentative" ? await getTentativeAvailabilityRatio(shoot) : null;

  const dayIsos = [...new Set(shoot.days.map((d) => toIsoDate(d.date)))];

  const data = {
    id: shoot.id,
    status: shoot.status,
    title: shoot.title,
    locationAddress: shoot.locationAddress,
    locationPlaceId: shoot.locationPlaceId,
    locationLat: shoot.locationLat,
    locationLng: shoot.locationLng,
    locationMapUrl: shoot.locationMapUrl,
    locationNotes: shoot.locationNotes,
    dayIsos,
    days: shoot.days.map((d) => ({
      id: d.id,
      dateIso: toIsoDate(d.date),
      halfDay: d.halfDay,
      defaultCallTime: d.defaultCallTime,
    })),
    activeSlots: activeSlots.map((s) => ({
      id: s.id,
      kind: s.kind,
      membershipId: s.membershipId,
      placeholderLabel: s.placeholderLabel,
      memberName: s.membership?.user.name ?? null,
    })),
    removedSlots: removedSlots.map((s) => ({
      id: s.id,
      memberName: s.membership?.user.name ?? s.placeholderLabel ?? "Unknown",
    })),
    invites: shoot.invites.map((inv) => ({
      id: inv.id,
      membershipId: inv.membershipId,
      memberName: inv.membership.user.name,
      status: inv.status,
      lastReminderSentAt: inv.lastReminderSentAt ? inv.lastReminderSentAt.toISOString() : null,
      overrides: inv.callTimeOverride.map((o) => ({ shootDayId: o.shootDayId, callTime: o.callTime })),
    })),
    tentativeRatio,
  };

  return (
    <NavShell activeHref="/shoots" user={{ id: session.user.id, name: session.user.name }} activeOrganizationId={organizationId}>
      <ShootDetailView shoot={data} isOrganiser={isOrganiser} />
    </NavShell>
  );
}
