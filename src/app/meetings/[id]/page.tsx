import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { NavShell } from "@/components/ui/nav-shell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toIsoDate } from "@/server/availability-rules";
import { getMeetingDetail, getTentativeAvailabilityRatio } from "@/server/meeting-detail";
import { getMembershipsForUser } from "@/server/memberships";

import { MeetingDetailView } from "@/components/meetings/meeting-detail-view";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) redirect("/");

  // Kicked off alongside the queries below, not awaited here, so NavShell's
  // fetch overlaps with the rest of the page's data instead of running after it.
  const membershipsPromise = getMembershipsForUser(session.user.id);

  const membership = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId, userId: session.user.id } },
  });
  if (!membership) redirect("/");

  const meeting = await getMeetingDetail(id, organizationId);
  if (!meeting) notFound();

  const isOrganiser = membership.role !== "member";

  const activeSlots = meeting.slots.filter((s) => !s.removedAt);
  const removedSlots = meeting.slots.filter((s) => s.removedAt);

  const tentativeRatio =
    meeting.status === "tentative" ? await getTentativeAvailabilityRatio(meeting) : null;

  const dayIsos = [...new Set(meeting.days.map((d) => toIsoDate(d.date)))];

  const data = {
    id: meeting.id,
    status: meeting.status,
    title: meeting.title,
    locationAddress: meeting.locationAddress,
    locationPlaceId: meeting.locationPlaceId,
    locationLat: meeting.locationLat,
    locationLng: meeting.locationLng,
    locationMapUrl: meeting.locationMapUrl,
    locationNotes: meeting.locationNotes,
    dayIsos,
    days: meeting.days.map((d) => ({
      id: d.id,
      dateIso: toIsoDate(d.date),
      halfDay: d.halfDay,
      defaultStartTime: d.defaultStartTime,
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
    invites: meeting.invites.map((inv) => ({
      id: inv.id,
      membershipId: inv.membershipId,
      memberName: inv.membership.user.name,
      status: inv.status,
      responseSource: inv.responseSource,
      lastReminderSentAt: inv.lastReminderSentAt ? inv.lastReminderSentAt.toISOString() : null,
      overrides: inv.startTimeOverride.map((o) => ({ meetingDayId: o.meetingDayId, startTime: o.startTime })),
    })),
    tentativeRatio,
  };

  return (
    <NavShell activeHref="/meetings" user={{ id: session.user.id, name: session.user.name }} activeOrganizationId={organizationId} memberships={membershipsPromise}>
      <MeetingDetailView meeting={data} isOrganiser={isOrganiser} />
    </NavShell>
  );
}
