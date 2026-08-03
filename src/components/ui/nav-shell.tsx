import type { ReactNode } from "react";

import { BottomTabBar, TopNav, DEFAULT_NAV_ITEMS, type NavItem, type NavUser } from "@/components/ui/nav";
import { SettingsIcon } from "@/components/ui/icons";
import { getMembershipsForUser, type Memberships } from "@/server/memberships";

/**
 * The standard authenticated-page frame (issue #11) — desktop TopNav above
 * the content, mobile BottomTabBar below it, same `activeHref` driving both.
 * Every top-level authenticated route composes this rather than one-off
 * rendering TopNav/BottomTabBar itself.
 *
 * Split out from nav.tsx (which stays server/client-agnostic, no Prisma
 * import) because this fetches memberships for the profile menu's film
 * switcher — pulling that into nav.tsx would drag Prisma into the client
 * bundle for any client component that imports TopNav/BottomTabBar directly
 * (e.g. the design-system showcase).
 *
 * Callers should pass `memberships` (kicked off alongside their own queries,
 * or already-resolved if they needed it themselves) so this fetch overlaps
 * with the rest of the page's data instead of running after it — every
 * top-level route renders NavShell, so a fetch here that isn't parallelized
 * adds its full round trip to every navigation. The self-fetch fallback
 * below only exists for callers that genuinely have nothing to pass (e.g.
 * the design-system showcase).
 */
export async function NavShell({
  activeHref,
  user,
  activeOrganizationId = null,
  memberships: membershipsInput,
  children,
}: {
  activeHref: string;
  user?: NavUser;
  activeOrganizationId?: string | null;
  memberships?: Memberships | Promise<Memberships>;
  children: ReactNode;
}) {
  const memberships = membershipsInput
    ? await membershipsInput
    : user
      ? await getMembershipsForUser(user.id)
      : { active: [], wrapped: [] };

  // Crew & Settings is organiser-only — /settings itself redirects crew away,
  // so don't dangle a nav item that just redirects them straight back out.
  const currentMembership = [...memberships.active, ...memberships.wrapped].find(
    (m) => m.organization.id === activeOrganizationId,
  );
  const isOrganiser = currentMembership && currentMembership.role !== "member";
  const items: NavItem[] = isOrganiser
    ? [...DEFAULT_NAV_ITEMS, { label: "Crew & Settings", href: "/settings", icon: SettingsIcon }]
    : DEFAULT_NAV_ITEMS;

  return (
    <>
      <TopNav items={items} activeHref={activeHref} user={user} activeOrganizationId={activeOrganizationId} memberships={memberships} />
      {/* cream-deep canvas on desktop only — gives page content (a PageShell
          sheet, or CenteredCard) a background to sit on top of, so it doesn't
          just blend into the page (mobile stays edge-to-edge, no canvas). */}
      <div className="flex flex-1 flex-col md:bg-cream-deep">{children}</div>
      <BottomTabBar items={items} activeHref={activeHref} user={user} activeOrganizationId={activeOrganizationId} memberships={memberships} />
    </>
  );
}
