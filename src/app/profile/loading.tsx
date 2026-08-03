import { CenteredCard } from "@/components/ui/centered-card";
import { Skeleton, SkeletonField, SkeletonNavShell } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonNavShell activeHref="/profile">
      <CenteredCard wide>
        <Skeleton className="mb-5 h-6 w-32" />
        <div className="mb-6 flex items-center gap-3.5 border-b border-hairline pb-5">
          <Skeleton className="h-[52px] w-[52px] shrink-0 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <div className="md:grid md:grid-cols-2 md:gap-6">
          <SkeletonField />
          <SkeletonField />
        </div>
      </CenteredCard>
    </SkeletonNavShell>
  );
}
