import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { BottomTabBar, TopNav, DEFAULT_NAV_ITEMS, type NavItem } from "@/components/ui/nav";
import { SettingsIcon } from "@/components/ui/icons";

/** Pulsing placeholder "bone" — the building block every route's loading.tsx composes into a page-shaped skeleton. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded bg-hairline", className)} />;
}

/**
 * Route-loading frame for authenticated pages: the real TopNav/BottomTabBar
 * (no `user`, so the profile menu is skipped rather than faked) wrapping a
 * skeleton body in place of the page's actual content. Pixel-matching the
 * real NavShell chrome means a navigation never "drops" to an unrelated
 * loading screen — only the content area shows a pulse while data loads.
 *
 * `showSettings` mirrors NavShell's organiser-only "Crew & Settings" item,
 * for routes that are always organiser-gated (e.g. /settings itself).
 */
export function SkeletonNavShell({
  activeHref,
  showSettings = false,
  children,
}: {
  activeHref: string;
  showSettings?: boolean;
  children: ReactNode;
}) {
  const items: NavItem[] = showSettings
    ? [...DEFAULT_NAV_ITEMS, { label: "Crew & Settings", href: "/settings", icon: SettingsIcon }]
    : DEFAULT_NAV_ITEMS;

  return (
    <>
      <TopNav items={items} activeHref={activeHref} />
      <div className="flex flex-1 flex-col md:bg-cream-deep">{children}</div>
      <BottomTabBar items={items} activeHref={activeHref} />
    </>
  );
}

/** Title + optional action-button skeleton, matching the h1/Button row every list page opens with. */
export function SkeletonPageHeader({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <Skeleton className="h-7 w-36" />
      {withAction && <Skeleton className="h-9 w-32 rounded-md" />}
    </div>
  );
}

/** Stand-in for a ListRow/link row: label + meta line on the left, a status-dot-shaped bone on the right. */
export function SkeletonListRow() {
  return (
    <div className="flex items-center justify-between border-b border-hairline py-3.5 last:border-b-0">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-16 rounded-full" />
    </div>
  );
}

export function SkeletonListRows({ count = 5 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListRow key={i} />
      ))}
    </div>
  );
}

/** The white bordered box used for "Quick actions" side panels on the dashboards. */
export function SkeletonSidePanel() {
  return (
    <div className="mt-8 rounded-md border border-hairline bg-white p-4 lg:mt-0">
      <Skeleton className="mb-3 h-3 w-24" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3.5 w-36" />
      </div>
    </div>
  );
}

/** A labeled text-field-shaped bone, for form skeletons (settings, profile, wizards). */
export function SkeletonField({ wide = false }: { wide?: boolean }) {
  return (
    <div className={cn("mb-4", wide && "md:col-span-2")}>
      <Skeleton className="mb-2 h-2.5 w-20" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

/** Month-grid of day cells, for the availability calendar/grid pages. */
export function SkeletonCalendarGrid({ weeks = 5 }: { weeks?: number }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {Array.from({ length: weeks * 7 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full rounded" />
      ))}
    </div>
  );
}
