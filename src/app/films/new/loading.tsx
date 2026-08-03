import { CenteredCard } from "@/components/ui/centered-card";
import { Skeleton, SkeletonField } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <CenteredCard wide>
      <Skeleton className="mb-5 h-7 w-48" />
      <SkeletonField wide />
      <SkeletonField wide />
    </CenteredCard>
  );
}
