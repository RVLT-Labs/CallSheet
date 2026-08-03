import { CenteredCard } from "@/components/ui/centered-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <CenteredCard>
      <Skeleton className="mb-5 h-7 w-40" />
      <Skeleton className="mb-2 h-10 w-full rounded-md" />
      <Skeleton className="h-10 w-full rounded-md" />
    </CenteredCard>
  );
}
