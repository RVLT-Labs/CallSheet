import { prisma } from "@/lib/prisma";

export async function getFilmMeetings(organizationId: string) {
  return prisma.meeting.findMany({
    where: { filmId: organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      days: { orderBy: { date: "asc" } },
      slots: { include: { membership: { include: { user: { select: { name: true } } } } } },
    },
  });
}
