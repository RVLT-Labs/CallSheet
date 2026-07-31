import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { MyMeetings } from "@/components/meetings/my-meetings";
import { MeetingsList, type MeetingListItem } from "@/components/meetings/meetings-list";
import { Button } from "@/components/ui/button";
import { NavShell } from "@/components/ui/nav-shell";
import { PageShell } from "@/components/ui/page-shell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyMeetingsData } from "@/server/my-meetings";
import { getFilmCrew } from "@/server/shoot-planning";
import { getFilmMeetings } from "@/server/meetings-list";

export default async function MeetingsPage() {
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
    const { upcoming, past } = await getMyMeetingsData(membership.id, organizationId, film.showTentativeToCrew);
    return (
      <NavShell activeHref="/meetings" user={{ id: session.user.id, name: session.user.name }} activeOrganizationId={organizationId}>
        <MyMeetings upcoming={upcoming} past={past} />
      </NavShell>
    );
  }

  const [meetings, crew] = await Promise.all([getFilmMeetings(organizationId), getFilmCrew(organizationId)]);

  return (
    <NavShell activeHref="/meetings" user={{ id: session.user.id, name: session.user.name }} activeOrganizationId={organizationId}>
      <PageShell maxWidth="max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold italic text-burgundy md:text-3xl">Meetings</h1>
          <Button href="/meetings/new">Plan a meeting</Button>
        </div>

        {meetings.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <p className="font-display text-xl font-bold italic text-burgundy">Nothing on the books yet</p>
            <p className="max-w-sm text-sm text-ink-soft">
              Once your crew has some availability in, Plan a meeting will find dates that actually work for
              everyone.
            </p>
          </div>
        )}

        {meetings.length > 0 && (
          <MeetingsList
            meetings={meetings.map((meeting): MeetingListItem => {
              const activeSlots = meeting.slots.filter((s) => !s.removedAt);
              return {
                id: meeting.id,
                title: meeting.title,
                status: meeting.status,
                dateIsos: [...new Set(meeting.days.map((d) => d.date.toISOString().slice(0, 10)))].sort(),
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
