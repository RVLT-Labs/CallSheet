import { PageShell } from "@/components/ui/page-shell";
import { Skeleton, SkeletonListRows, SkeletonNavShell, SkeletonSidePanel } from "@/components/ui/skeleton";

/**
 * App-wide route loading state (Next.js convention) — shaped like the
 * dashboard (CrewToday/OrganiserDashboard share this frame) since "/" is
 * where most navigations land. Real nav chrome up top so a slow navigation
 * never drops to an unrelated full-page spinner; only the content pulses.
 */
export default function Loading() {
  return (
    <SkeletonNavShell activeHref="/">
      <PageShell maxWidth="max-w-7xl">
        <Skeleton className="mb-1 h-3 w-24" />
        <Skeleton className="mb-8 h-8 w-40" />
        <div className="lg:grid lg:grid-cols-[1fr_280px] lg:items-start lg:gap-10">
          <div>
            <Skeleton className="mb-2 h-3 w-20" />
            <SkeletonListRows count={5} />
          </div>
          <SkeletonSidePanel />
        </div>
      </PageShell>
    </SkeletonNavShell>
  );
}
