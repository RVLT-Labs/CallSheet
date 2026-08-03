import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { NavShell } from "@/components/ui/nav-shell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMembershipsForUser } from "@/server/memberships";
import { getWrapSummary } from "@/server/wrap-summary";

/**
 * The wrap milestone (issue #12 scope) — quiet celebration, not a joke,
 * distinct in tone from the lighter empty states elsewhere on this page.
 */
export default async function WrappedPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) redirect("/");

  // Kicked off alongside the queries below, not awaited here, so NavShell's
  // fetch overlaps with the rest of the page's data instead of running after it.
  const membershipsPromise = getMembershipsForUser(session.user.id);

  const [film, membership] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    prisma.member.findUnique({
      where: { organizationId_userId: { organizationId, userId: session.user.id } },
    }),
  ]);
  if (!membership) redirect("/");
  if (film.status !== "wrapped") redirect("/settings");

  const { shootsCount, crewCount, acceptanceRate } = await getWrapSummary(organizationId);

  return (
    <NavShell activeHref="/wrapped" user={{ id: session.user.id, name: session.user.name }} activeOrganizationId={organizationId} memberships={membershipsPromise}>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="mb-1 text-[13px] text-ink-soft">{film.name}</p>
        <h1 className="font-display mb-2 text-3xl font-bold italic text-burgundy">That&apos;s a wrap.</h1>
        <p className="mb-10 max-w-sm text-[13.5px] text-ink-soft">
          Thank you to everyone who showed up, said yes, and made the days work.
        </p>

        <div className="grid w-full grid-cols-3 gap-4">
          <div className="rounded-lg border border-hairline bg-white p-4">
            <p className="font-mono text-2xl font-bold text-ink">{shootsCount}</p>
            <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
              Shoot{shootsCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-lg border border-hairline bg-white p-4">
            <p className="font-mono text-2xl font-bold text-ink">{crewCount}</p>
            <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Crew</p>
          </div>
          <div className="rounded-lg border border-hairline bg-white p-4">
            <p className="font-mono text-2xl font-bold text-ink">
              {acceptanceRate === null ? "N/A" : `${acceptanceRate}%`}
            </p>
            <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Accepted</p>
          </div>
        </div>
      </div>
    </NavShell>
  );
}
