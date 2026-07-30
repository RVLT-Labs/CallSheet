import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import { cn } from "@/lib/cn";
import { CalendarIcon, ClapperboardIcon, EnvelopeIcon, HomeIcon } from "@/components/ui/icons";

export type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: "Today", href: "/", icon: HomeIcon },
  { label: "Availability", href: "/availability", icon: CalendarIcon },
  { label: "Shoots", href: "/shoots", icon: ClapperboardIcon },
  { label: "Comms", href: "/comms", icon: EnvelopeIcon },
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
    <nav className="flex justify-around border-t border-hairline bg-cream py-3 md:hidden">
      {items.map((item) => {
        const active = item.href === activeHref;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
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
      <span className="font-display text-xl font-bold italic text-burgundy">Callsheet</span>
      <div className="flex gap-8">
        {items.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
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
