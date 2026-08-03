import { CenteredCard } from "@/components/ui/centered-card";
import { Skeleton, SkeletonField, SkeletonListRows, SkeletonNavShell } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonNavShell activeHref="/settings" showSettings>
      <CenteredCard wide>
        <Skeleton className="mb-5 h-7 w-44" />
        <SkeletonField wide />
        <div className="md:grid md:grid-cols-2 md:gap-6">
          <SkeletonField />
          <SkeletonField />
        </div>
        <Skeleton className="mb-2 mt-2 h-3 w-16" />
        <SkeletonListRows count={4} />
      </CenteredCard>
    </SkeletonNavShell>
  );
}
