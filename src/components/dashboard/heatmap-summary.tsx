import Link from "next/link";

import { cn } from "@/lib/cn";
import { TIER_BG } from "@/lib/availability-tiers";
import type { HeatmapDay } from "@/server/dashboard";

/**
 * Condensed crew-availability glance for the organiser dashboard (issue #11
 * scope) — one majority-tier swatch per half-day, not the full per-person
 * breakdown (that stays at /availability/grid, issue #7).
 */
export function HeatmapSummary({ days }: { days: HeatmapDay[] }) {
  if (days.length === 0) {
    return <p className="text-[13px] text-ink-soft">No working dates set yet.</p>;
  }

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {days.map((day) => (
          <div key={day.dateIso} className="flex shrink-0 flex-col items-center gap-1">
            <span className="text-[10px] text-ink-faint">{day.dateIso.slice(5)}</span>
            <div className="flex h-8 w-4 flex-col overflow-hidden rounded-sm border border-hairline">
              <div className={cn("flex-1", day.am ? TIER_BG[day.am] : "bg-cream-deep")} />
              <div className={cn("flex-1", day.pm ? TIER_BG[day.pm] : "bg-cream-deep")} />
            </div>
          </div>
        ))}
      </div>
      <Link href="/availability/grid" className="mt-2 inline-block text-[12px] font-semibold text-burgundy">
        View full grid
      </Link>
    </div>
  );
}
