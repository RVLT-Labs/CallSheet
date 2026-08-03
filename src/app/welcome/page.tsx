import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { CenteredCard } from "@/components/ui/centered-card";
import { WelcomeFlow } from "@/components/onboarding/welcome-flow";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMembershipsForUser } from "@/server/memberships";

/**
 * Onboarding landing spot, reached two ways:
 *  - Self-signup (no invite): someone who typed their email in at /sign-in
 *    rather than following an invite link. Walks name -> create a film.
 *  - Invited crew, first login ever: they already have a film via
 *    acceptInvitation (better-auth's emailOtp sign-up leaves a brand-new
 *    user's name blank), so they only need the name step before landing
 *    on the dashboard — accept-invitation-client.tsx sends them here
 *    instead of "/" when their name is still blank.
 */
export default async function WelcomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { name: true, onboardedAt: true },
  });

  const { active, wrapped } = await getMembershipsForUser(session.user.id);
  const hasFilm = active.length > 0 || wrapped.length > 0;

  // Self-signup users who've finished onboarding, or invited crew who
  // already have a name, have nothing left to do here.
  if (user.onboardedAt || (hasFilm && user.name.trim())) redirect("/");

  return (
    <CenteredCard wide>
      <WelcomeFlow initialName={user.name} skipFilmStep={hasFilm} />
    </CenteredCard>
  );
}
