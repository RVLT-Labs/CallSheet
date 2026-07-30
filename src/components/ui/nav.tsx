import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";

import { cn } from "@/lib/cn";
import { CalendarIcon, ClapperboardIcon, HomeIcon } from "@/components/ui/icons";

export type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Anchor id for the dashboard product tour (product-tour.tsx) — omitted where a step doesn't target this item. */
  tourId?: string;
};

// Comms (bulk messaging, issue #15) isn't built yet — left out of the nav
// until the route exists rather than linking somewhere that 404s.
export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: "Today", href: "/", icon: HomeIcon },
  { label: "Availability", href: "/availability", icon: CalendarIcon, tourId: "nav-availability" },
  { label: "Shoots", href: "/shoots", icon: ClapperboardIcon, tourId: "nav-shoots" },
];

type NavProps = {
  items?: NavItem[];
  activeHref: string;
};

/**
 * Mobile bottom tab bar (design system §5.6) — 4 items, custom thin-stroke
 * icons, never emoji. Inactive = ink-soft stroke, active = burgundy stroke.
 */
export function BottomTabBar({ items = DEFAULT_NAV_ITEMS, activeHref }: NavProps) {
  return (
    <nav className="flex justify-around border-t border-hairline bg-cream pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:hidden">
      {items.map((item) => {
        const active = item.href === activeHref;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            data-tour={item.tourId}
            className="flex flex-col items-center gap-1"
          >
            <Icon
              className={cn("h-5 w-5", active ? "stroke-burgundy" : "stroke-ink-soft")}
            />
            <span className={cn("text-[10px] font-medium", active ? "text-burgundy" : "text-ink-soft")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Desktop top nav (design system §5.6) — wordmark + text tabs with an
 * underline on the active item. No sidebar — deliberate correction from an
 * earlier sidebar pass that felt too "generic SaaS dashboard."
 */
export function TopNav({ items = DEFAULT_NAV_ITEMS, activeHref }: NavProps) {
  return (
    <nav className="hidden items-center justify-between border-b border-hairline px-8 py-4 md:flex">
      <Link href="/" className="font-display text-xl font-bold italic text-burgundy">
        Callsheet
      </Link>
      <div className="flex gap-8">
        {items.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              data-tour={item.tourId}
              className={cn(
                "border-b-2 pb-1 text-sm font-semibold",
                active ? "border-burgundy text-ink" : "border-transparent text-ink-soft",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * The standard authenticated-page frame (issue #11) — desktop TopNav above
 * the content, mobile BottomTabBar below it, same `activeHref` driving both.
 * Every top-level authenticated route composes this rather than one-off
 * rendering TopNav/BottomTabBar itself.
 */
export function NavShell({ activeHref, children }: { activeHref: string; children: ReactNode }) {
  return (
    <>
      <TopNav activeHref={activeHref} />
      {/* cream-deep canvas on desktop only — gives page content (a PageShell
          sheet, or CenteredCard) a background to sit on top of, so it doesn't
          just blend into the page (mobile stays edge-to-edge, no canvas). */}
      <div className="flex flex-1 flex-col md:bg-cream-deep">{children}</div>
      <BottomTabBar activeHref={activeHref} />
    </>
  );
}
