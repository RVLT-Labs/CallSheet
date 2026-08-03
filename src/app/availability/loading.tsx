import { PageShell } from "@/components/ui/page-shell";
import { Skeleton, SkeletonCalendarGrid, SkeletonNavShell } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonNavShell activeHref="/availability">
      <PageShell maxWidth="max-w-5xl">
        <div className="mb-6">
          <Skeleton className="mb-1 h-8 w-56" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <SkeletonCalendarGrid weeks={5} />
      </PageShell>
    </SkeletonNavShell>
  );
}
