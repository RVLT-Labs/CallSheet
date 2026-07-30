import { headers } from "next/headers";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { FilmPicker } from "@/components/film-picker/film-picker";
import { auth } from "@/lib/auth";
import { getMembershipsForUser } from "@/server/memberships";

// Stub home page. The real Today/schedule screen (design system §5, spec
// §4.4/§4.7) is built in issue #11 once auth and shoots exist to show.
export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="font-display text-4xl font-bold italic text-burgundy">Callsheet</span>
        <p className="max-w-sm text-sm text-ink-soft">
          The Today screen lands in issue #11. In the meantime, see the{" "}
          <Link href="/design-system" className="font-semibold text-burgundy">
            component library
          </Link>{" "}
          or{" "}
          <Link href="/sign-in" className="font-semibold text-burgundy">
            sign in
          </Link>
          .
        </p>
      </div>
    );
  }

  const { active, wrapped } = await getMembershipsForUser(session.user.id);
  const activeOrganizationId = session.session.activeOrganizationId ?? null;
  const activeFilm = active.find((m) => m.organization.id === activeOrganizationId);
  const activeFilmName = activeFilm?.organization.name ?? "Callsheet";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <FilmPicker
        active={active}
        wrapped={wrapped}
        activeOrganizationId={activeOrganizationId}
        activeFilmName={activeFilmName}
      />
      <p className="max-w-sm text-sm text-ink-soft">
        Signed in as {session.user.email}. The Today screen lands in issue #11.
      </p>
      <div className="flex items-center gap-4">
        <Link href="/profile" className="text-[13px] font-semibold text-burgundy">
          Edit profile
        </Link>
        {activeFilm && activeFilm.role !== "member" && (
          <Link href="/settings" className="text-[13px] font-semibold text-burgundy">
            Film settings
          </Link>
        )}
        <SignOutButton />
      </div>
    </div>
  );
}
