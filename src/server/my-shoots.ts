import { prisma } from "@/lib/prisma";
import { isShootVisibleToCrew } from "@/lib/my-shoots-rules";
import { toIsoDate } from "@/server/availability-rules";

export type MyShoot = {
  id: string;
  title: string | null;
  status: "tentative" | "confirmed";
  dateIsos: string[];
  inviteId: string | null;
  inviteStatus: "pending" | "accepted" | "declined" | null;
};

function shootDateIsos(days: { date: Date }[]) {
  return [...new Set(days.map((d) => toIsoDate(d.date)))].sort();
}

function isPast(dateIsos: string[], todayIso: string) {
  return dateIsos.length > 0 && dateIsos[dateIsos.length - 1] < todayIso;
}

export async function getMyShootsData(membershipId: string, organizationId: string, showTentativeToCrew: boolean) {
  const slots = await prisma.shootSlot.findMany({
    where: { membershipId, removedAt: null, shoot: { filmId: organizationId } },
    select: {
      shoot: {
        include: {
          days: { orderBy: { date: "asc" } },
          invites: { where: { membershipId }, select: { id: true, status: true } },
        },
      },
    },
  });

  const todayIso = toIsoDate(new Date());

  const shoots: MyShoot[] = slots
    .map((s) => s.shoot)
    .filter((shoot) => isShootVisibleToCrew(shoot.status, showTentativeToCrew))
    .map((shoot) => {
      const invite = shoot.invites[0] ?? null;
      return {
        id: shoot.id,
        title: shoot.title,
        status: shoot.status,
        dateIsos: shootDateIsos(shoot.days),
        inviteId: invite?.id ?? null,
        inviteStatus: invite?.status ?? null,
      };
    });

  const upcoming = shoots
    .filter((s) => !isPast(s.dateIsos, todayIso))
    .sort((a, b) => (a.dateIsos[0] ?? "").localeCompare(b.dateIsos[0] ?? ""));

  const past = shoots
    .filter((s) => isPast(s.dateIsos, todayIso))
    .sort((a, b) => (b.dateIsos[0] ?? "").localeCompare(a.dateIsos[0] ?? ""));

  const sortedPending = upcoming.filter((s) => s.inviteStatus === "pending");

  return { upcoming, past, pending: sortedPending };
}

/** Session-authenticated Accept/Decline for the crew dashboard — the no-login token flow (#10) is a separate path for the email link. */
export async function respondAsMember(inviteId: string, membershipId: string, response: "accepted" | "declined") {
  const invite = await prisma.shootInvite.findUniqueOrThrow({ where: { id: inviteId } });
  if (invite.membershipId !== membershipId) throw new Error("This invite doesn't belong to you");

  await prisma.shootInvite.update({
    where: { id: inviteId },
    data: { status: response, respondedAt: new Date() },
  });
}
