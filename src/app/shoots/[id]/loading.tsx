import { PageShell } from "@/components/ui/page-shell";
import { Skeleton, SkeletonListRows, SkeletonNavShell } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonNavShell activeHref="/shoots">
      <PageShell maxWidth="max-w-6xl">
        <div className="mb-6">
          <Skeleton className="mb-1.5 h-4 w-20 rounded-full" />
          <Skeleton className="mb-1 h-8 w-56" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        <div className="lg:grid lg:grid-cols-[1fr_280px] lg:items-start lg:gap-10">
          <div>
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="mb-4 h-2.5 w-full rounded-full" />
            <SkeletonListRows count={5} />
          </div>
          <div className="mt-8 rounded-md border border-hairline bg-white p-4 lg:mt-0">
            <Skeleton className="mb-3 h-3 w-16" />
            <Skeleton className="h-3.5 w-full" />
          </div>
        </div>
      </PageShell>
    </SkeletonNavShell>
  );
}
