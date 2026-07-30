// Pure My Shoots rules (issue #11 acceptance criteria) — no Prisma import, so
// this is safe to use from client components as well as the server module
// that fetches the real data (src/server/my-shoots.ts).

/** A crew member never sees a wall of N pending cards — just the soonest, plus the rest banner. */
export function splitSoonestPending<T>(sortedPending: T[]): { soonest: T | null; rest: T[] } {
  return { soonest: sortedPending[0] ?? null, rest: sortedPending.slice(1) };
}

export const STICKY_ACCEPT_ALL_THRESHOLD = 7;

/** The sticky "Accept all" footer only earns its place once the list is long enough to need it. */
export function needsStickyAcceptAllFooter(totalPendingCount: number) {
  return totalPendingCount >= STICKY_ACCEPT_ALL_THRESHOLD;
}

/**
 * A Tentative shoot never appears on a crew dashboard unless the film
 * explicitly opts in, and even then it must never read as a booking (spec
 * §4.7, issue #11 acceptance criteria) — this is the visibility gate; the
 * caller is responsible for rendering it distinctly, not just gating it.
 */
export function isShootVisibleToCrew(status: "tentative" | "confirmed", showTentativeToCrew: boolean) {
  return status === "confirmed" || showTentativeToCrew;
}
