import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { CenteredCard } from "@/components/ui/centered-card";
import { WelcomeFlow } from "@/components/onboarding/welcome-flow";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMembershipsForUser } from "@/server/memberships";

/**
 * Self-signup (no invite) landing spot — someone who typed their email in
 * at /sign-in rather than following an invite link. Invited crew already
 * get a film via acceptInvitation, so they skip straight past this.
 */
export default async function WelcomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { name: true, onboardedAt: true },
  });

  const { active, wrapped } = await getMembershipsForUser(session.user.id);
  if (user.onboardedAt || active.length > 0 || wrapped.length > 0) redirect("/");

  return (
    <CenteredCard wide>
      <WelcomeFlow initialName={user.name} />
    </CenteredCard>
  );
}
