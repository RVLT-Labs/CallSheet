import { prisma } from "@/lib/prisma";

export async function getFilmShoots(organizationId: string) {
  return prisma.shoot.findMany({
    where: { filmId: organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      days: { orderBy: { date: "asc" } },
      slots: { include: { membership: { include: { user: { select: { name: true } } } } } },
    },
  });
}
