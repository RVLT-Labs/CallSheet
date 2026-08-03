import { PageShell } from "@/components/ui/page-shell";
import { SkeletonListRows, SkeletonNavShell, SkeletonPageHeader } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonNavShell activeHref="/meetings">
      <PageShell maxWidth="max-w-7xl">
        <SkeletonPageHeader withAction />
        <SkeletonListRows count={6} />
      </PageShell>
    </SkeletonNavShell>
  );
}
