import type { ReactNode } from "react";

/**
 * Used deliberately, not by default (design system §5.5) — reserve for the
 * one or two elements per screen that deserve visual weight (soonest
 * pending-invite card, shoot-confirm summary box, bottom sheets/modals
 * themselves). Everything else should be a ListRow.
 */
export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-hairline bg-white p-4 shadow-[0_2px_8px_rgba(58,46,40,0.05)]">
      {children}
    </div>
  );
}
