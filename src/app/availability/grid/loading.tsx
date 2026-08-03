import { PageShell } from "@/components/ui/page-shell";
import { Skeleton, SkeletonNavShell } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonNavShell activeHref="/availability">
      <PageShell maxWidth="max-w-7xl">
        <Skeleton className="mb-6 h-8 w-64" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <Skeleton className="h-6 flex-1 rounded" />
            </div>
          ))}
        </div>
      </PageShell>
    </SkeletonNavShell>
  );
}
