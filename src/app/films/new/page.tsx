import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { CenteredCard } from "@/components/ui/centered-card";
import { FilmCreationWizard } from "@/components/films/film-creation-wizard";
import { auth } from "@/lib/auth";

export default async function NewFilmPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  return (
    <CenteredCard wide>
      <FilmCreationWizard />
    </CenteredCard>
  );
}
