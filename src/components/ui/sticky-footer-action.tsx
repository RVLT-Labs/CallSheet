import type { ReactNode } from "react";

/**
 * For long scrollable lists (7+ items) where the bulk action would
 * otherwise require scrolling to find (design system §5.8) — e.g. "Accept
 * all" at the bottom of the My Shoots pending-invites sheet.
 */
export function StickyFooterAction({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 border-t border-hairline bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}
