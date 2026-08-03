import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <Skeleton className="h-5 w-64" />
      <Skeleton className="h-3.5 w-56" />
      <Skeleton className="mt-2 h-10 w-40 rounded-md" />
    </div>
  );
}
