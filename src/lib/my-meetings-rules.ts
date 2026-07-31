// Pure My Meetings rules — no Prisma import, so this is safe to use from
// client components as well as the server module that fetches the real data
// (src/server/my-meetings.ts). splitSoonestPending and the sticky footer rule
// are fully generic and shared straight from my-shoots-rules.ts.

/**
 * A Tentative meeting never appears on a crew dashboard unless the film
 * explicitly opts in, and even then it must never read as a booking — this
 * is the visibility gate; the caller is responsible for rendering it
 * distinctly, not just gating it.
 */
export function isMeetingVisibleToCrew(status: "tentative" | "confirmed", showTentativeToCrew: boolean) {
  return status === "confirmed" || showTentativeToCrew;
}

/**
 * Crew's "nothing scheduled" empty state gets a light line of personality and
 * deliberately no CTA — there's nothing for them to do, the organiser hasn't
 * locked anything in yet. Meeting-flavored counterpart to my-shoots-rules.ts's
 * NOTHING_SCHEDULED_COPY, kept in the same voice.
 */
export const NOTHING_SCHEDULED_COPY = "No meetings on the books yet. Check back once something's locked in.";
