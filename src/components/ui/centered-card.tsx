import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Centered flow, full width on mobile (no card chrome); a bordered white
 * card centered on a wide canvas on desktop — "not a stretched full-width
 * form" (style-board-v12-desktop.html). Shared by auth screens (max-w-sm)
 * and the profile screen (max-w-xl, two-column desktop layout).
 */
export function CenteredCard({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div
        className={cn(
          "w-full md:rounded-lg md:border md:border-hairline md:bg-white md:p-9 md:shadow-[0_10px_30px_rgba(58,46,40,0.08)]",
          wide ? "max-w-xl" : "max-w-sm",
        )}
      >
        {children}
      </div>
    </div>
  );
}
