import type { Tier } from "@/lib/availability-tiers";

// Worst-first tie-break: on an even split, the dashboard summary should
// flag caution rather than quietly round up to "Best" — an organiser glancing
// at the heat-map should never be misled into thinking a day is safer than it is.
const TIE_BREAK_ORDER: Tier[] = ["unavailable", "ok", "best"];

/** The single tier that best represents a half-day across the whole crew, for a compact dashboard summary. */
export function majorityTier(tiers: (Tier | null)[]): Tier | null {
  const counts: Record<Tier, number> = { best: 0, ok: 0, unavailable: 0 };
  for (const tier of tiers) if (tier) counts[tier]++;

  const max = Math.max(counts.best, counts.ok, counts.unavailable);
  if (max === 0) return null;

  return TIE_BREAK_ORDER.find((tier) => counts[tier] === max) ?? null;
}
