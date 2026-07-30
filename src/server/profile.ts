import { prisma } from "@/lib/prisma";

export async function getProfileContext(userId: string, activeOrganizationId: string | null) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, phone: true },
  });

  if (!activeOrganizationId) {
    return { user, membership: null };
  }

  const membership = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId: activeOrganizationId, userId } },
    select: {
      roleTags: true,
      organization: { select: { name: true, showCrewContactsToCrew: true } },
    },
  });

  return { user, membership };
}
