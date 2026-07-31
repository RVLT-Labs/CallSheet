import { prisma } from "@/lib/prisma";
import { isMeetingVisibleToCrew } from "@/lib/my-meetings-rules";
import { toIsoDate } from "@/server/availability-rules";
import type { InviteResponseSource } from "@/server/invite-roster";

export type MyMeeting = {
  id: string;
  title: string | null;
  status: "tentative" | "confirmed";
  dateIsos: string[];
  inviteId: string | null;
  inviteStatus: "pending" | "accepted" | "declined" | null;
  inviteResponseSource: InviteResponseSource | null;
};

function meetingDateIsos(days: { date: Date }[]) {
  return [...new Set(days.map((d) => toIsoDate(d.date)))].sort();
}

function isPast(dateIsos: string[], todayIso: string) {
  return dateIsos.length > 0 && dateIsos[dateIsos.length - 1] < todayIso;
}

export async function getMyMeetingsData(membershipId: string, organizationId: string, showTentativeToCrew: boolean) {
  const slots = await prisma.meetingSlot.findMany({
    where: { membershipId, removedAt: null, meeting: { filmId: organizationId } },
    select: {
      meeting: {
        include: {
          days: { orderBy: { date: "asc" } },
          invites: { where: { membershipId }, select: { id: true, status: true, responseSource: true } },
        },
      },
    },
  });

  const todayIso = toIsoDate(new Date());

  const meetings: MyMeeting[] = slots
    .map((s) => s.meeting)
    .filter((meeting) => isMeetingVisibleToCrew(meeting.status, showTentativeToCrew))
    .map((meeting) => {
      const invite = meeting.invites[0] ?? null;
      return {
        id: meeting.id,
        title: meeting.title,
        status: meeting.status,
        dateIsos: meetingDateIsos(meeting.days),
        inviteId: invite?.id ?? null,
        inviteStatus: invite?.status ?? null,
        inviteResponseSource: invite?.responseSource ?? null,
      };
    });

  const upcoming = meetings
    .filter((m) => !isPast(m.dateIsos, todayIso))
    .sort((a, b) => (a.dateIsos[0] ?? "").localeCompare(b.dateIsos[0] ?? ""));

  const past = meetings
    .filter((m) => isPast(m.dateIsos, todayIso))
    .sort((a, b) => (b.dateIsos[0] ?? "").localeCompare(a.dateIsos[0] ?? ""));

  const sortedPending = upcoming.filter((m) => m.inviteStatus === "pending");

  return { upcoming, past, pending: sortedPending };
}

/** Session-authenticated Accept/Decline for the crew dashboard — the no-login token flow is a separate path for the email link. */
export async function respondAsMember(inviteId: string, membershipId: string, response: "accepted" | "declined") {
  const invite = await prisma.meetingInvite.findUniqueOrThrow({ where: { id: inviteId } });
  if (invite.membershipId !== membershipId) throw new Error("This invite doesn't belong to you");

  await prisma.meetingInvite.update({
    where: { id: inviteId },
    data: {
      status: response,
      respondedAt: new Date(),
      // The crew member's own response always wins over a prior organiser override.
      responseSource: "crew",
      overriddenByMembershipId: null,
    },
  });
}
