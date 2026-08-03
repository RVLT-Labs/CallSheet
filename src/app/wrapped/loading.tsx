import { Skeleton, SkeletonNavShell } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonNavShell activeHref="/wrapped">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <Skeleton className="mb-1 h-3.5 w-24" />
        <Skeleton className="mb-2 h-8 w-56" />
        <Skeleton className="mb-10 h-3.5 w-72" />
        <div className="grid w-full grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-hairline bg-white p-4">
              <Skeleton className="mb-2 h-7 w-10" />
              <Skeleton className="h-2.5 w-14" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonNavShell>
  );
}
