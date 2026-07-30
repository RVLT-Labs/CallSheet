import { prisma } from "@/lib/prisma";

export async function getFilmSettingsContext(organizationId: string, userId: string) {
  const film = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
  });

  const membership = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { role: true },
  });

  const organisers = await prisma.member.findMany({
    where: { organizationId, role: { not: "member" } },
    select: { id: true, role: true, user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const crew = await prisma.member.findMany({
    where: { organizationId, role: "member" },
    select: { id: true, roleTags: true, user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return {
    film,
    isOrganiser: membership?.role !== "member" && !!membership,
    organisers,
    crew,
  };
}
