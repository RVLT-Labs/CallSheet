/**
 * App-wide route loading state (Next.js convention — picked up for any
 * navigation whose target page suspends, e.g. the dashboard's Prisma
 * queries). Without this, a slow navigation just leaves the previous page
 * sitting on screen looking frozen instead of showing anything is happening.
 */
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <p className="font-display animate-pulse text-3xl font-bold italic text-burgundy">
        Callsheet
      </p>
      <p className="text-[12.5px] text-ink-soft">Loading…</p>
    </div>
  );
}
