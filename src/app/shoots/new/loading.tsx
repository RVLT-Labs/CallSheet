import { CenteredCard } from "@/components/ui/centered-card";
import { Skeleton, SkeletonField, SkeletonNavShell } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonNavShell activeHref="/shoots">
      <CenteredCard wide>
        <Skeleton className="mb-5 h-7 w-48" />
        <SkeletonField wide />
        <SkeletonField wide />
        <div className="md:grid md:grid-cols-2 md:gap-6">
          <SkeletonField />
          <SkeletonField />
        </div>
        <Skeleton className="mt-4 h-10 w-full rounded-md" />
      </CenteredCard>
    </SkeletonNavShell>
  );
}
