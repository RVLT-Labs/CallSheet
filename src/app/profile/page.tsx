import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { CenteredCard } from "@/components/ui/centered-card";
import { NavShell } from "@/components/ui/nav-shell";
import { ProfileForm } from "@/components/profile/profile-form";
import { PasskeyManager } from "@/components/profile/passkey-manager";
import { auth } from "@/lib/auth";
import { getMembershipsForUser } from "@/server/memberships";
import { getProfileContext } from "@/server/profile";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  // Kicked off alongside the query below, not awaited here, so NavShell's
  // fetch overlaps with the rest of the page's data instead of running after it.
  const membershipsPromise = getMembershipsForUser(session.user.id);

  const { user, membership } = await getProfileContext(
    session.user.id,
    session.session.activeOrganizationId ?? null,
  );

  return (
    <NavShell
      activeHref="/profile"
      user={{ id: session.user.id, name: user.name }}
      activeOrganizationId={session.session.activeOrganizationId ?? null}
      memberships={membershipsPromise}
    >
      <CenteredCard wide>
        <h1 className="mb-5 text-base font-bold">Your profile</h1>
        <ProfileForm name={user.name} phone={user.phone} membership={membership} />
        <PasskeyManager />
      </CenteredCard>
    </NavShell>
  );
}
