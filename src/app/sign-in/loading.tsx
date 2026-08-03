import { CenteredCard } from "@/components/ui/centered-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <CenteredCard>
      <Skeleton className="mb-6 h-9 w-full rounded-md" />
      <Skeleton className="mb-2 h-10 w-full rounded-md" />
      <Skeleton className="h-10 w-full rounded-md" />
    </CenteredCard>
  );
}
