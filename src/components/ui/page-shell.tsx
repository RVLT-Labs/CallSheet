import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Standard content frame for top-anchored (non-form) authenticated pages —
 * full width on mobile, same chrome-less flow as before; on desktop, a
 * bordered cream sheet raised off the NavShell's cream-deep canvas, so page
 * content reads as a distinct surface instead of blending into the page.
 * Mirrors CenteredCard's mobile/desktop split, for pages that aren't a
 * vertically-centered form (dashboard, shoots list, shoot detail, etc).
 */
export function PageShell({
  children,
  maxWidth = "max-w-3xl",
  className,
}: {
  children: ReactNode;
  maxWidth?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-8",
        "md:my-8 md:rounded-lg md:border md:border-hairline md:bg-cream md:px-10 md:py-10 md:shadow-[0_10px_30px_rgba(58,46,40,0.08)]",
        maxWidth,
        className,
      )}
    >
      {children}
    </div>
  );
}
