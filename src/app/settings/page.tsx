import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { CenteredCard } from "@/components/ui/centered-card";
import { NavShell } from "@/components/ui/nav-shell";
import { FilmSettingsForm } from "@/components/settings/film-settings-form";
import { auth } from "@/lib/auth";
import { getFilmSettingsContext } from "@/server/film-settings";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) redirect("/");

  const { film, isOrganiser, organisers, crew } = await getFilmSettingsContext(organizationId, session.user.id);
  if (!isOrganiser) redirect("/");

  return (
    <NavShell
      activeHref="/settings"
      user={{ id: session.user.id, name: session.user.name }}
      activeOrganizationId={organizationId}
    >
      <CenteredCard wide>
        <h1 className="font-display mb-5 text-2xl font-bold italic text-burgundy">Crew & Settings</h1>
        <FilmSettingsForm film={film} organisers={organisers} crew={crew} currentUserId={session.user.id} />
      </CenteredCard>
    </NavShell>
  );
}
