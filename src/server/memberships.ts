import { prisma } from "@/lib/prisma";

export async function getMembershipsForUser(userId: string) {
  const memberships = await prisma.member.findMany({
    where: { userId },
    select: {
      id: true,
      role: true,
      organization: { select: { id: true, name: true, slug: true, status: true } },
    },
    orderBy: { organization: { name: "asc" } },
  });

  return {
    active: memberships.filter((m) => m.organization.status === "active"),
    wrapped: memberships.filter((m) => m.organization.status === "wrapped"),
  };
}

export type Membership = Awaited<ReturnType<typeof getMembershipsForUser>>["active"][number];
