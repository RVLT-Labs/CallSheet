import { CenteredCard } from "@/components/ui/centered-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <CenteredCard>
      <Skeleton className="mb-2 h-5 w-48" />
      <Skeleton className="mb-6 h-3.5 w-56" />
      <Skeleton className="h-10 w-full rounded-md" />
    </CenteredCard>
  );
}
