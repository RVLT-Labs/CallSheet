import { prisma } from "@/lib/prisma";
import { calculateAcceptanceRate } from "@/lib/wrap-summary";

/**
 * The wrap milestone screen's stats (issue #12 scope): shoots, crew,
 * acceptance rate. "Shoots" counts Confirmed ones only — a Tentative hold
 * that never got confirmed isn't a shoot that happened.
 */
export async function getWrapSummary(organizationId: string) {
  const [shootsCount, crewCount, invites] = await Promise.all([
    prisma.shoot.count({ where: { filmId: organizationId, status: "confirmed" } }),
    prisma.member.count({ where: { organizationId } }),
    prisma.shootInvite.findMany({ where: { shoot: { filmId: organizationId } }, select: { status: true } }),
  ]);

  const accepted = invites.filter((i) => i.status === "accepted").length;

  return {
    shootsCount,
    crewCount,
    acceptanceRate: calculateAcceptanceRate(accepted, invites.length),
  };
}
