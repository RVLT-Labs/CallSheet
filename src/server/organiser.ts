import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMembershipsForUser } from "@/server/memberships";

/** Guards a page/action to the active film's organisers only. */
export async function requireActiveOrganiserFilm() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) redirect("/");

  // Kicked off alongside the film/membership lookup (not awaited here) so
  // callers can hand it straight to NavShell and its query overlaps with
  // the rest of the page's data instead of running after it.
  const membershipsPromise = getMembershipsForUser(session.user.id);

  const [film, membership] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    prisma.member.findUnique({
      where: { organizationId_userId: { organizationId, userId: session.user.id } },
    }),
  ]);

  if (!membership || membership.role === "member") redirect("/");

  return { session, organizationId, film, membership, membershipsPromise };
}
