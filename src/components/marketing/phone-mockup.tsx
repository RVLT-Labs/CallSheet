import type { ReactNode } from "react";

/**
 * Chrome-only wrapper for showing a real screen at true mobile proportions
 * (375x812, the same ratio the app itself renders at below the `md`
 * breakpoint) on the landing page (design system §1) — never a stock image
 * or fabricated UI, the content passed in is built from the same
 * components as the app, including the real BottomTabBar.
 */
export function PhoneMockup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="w-[300px] shrink-0">
      <div className="relative rounded-[40px] border-[10px] border-ink bg-ink shadow-[0_20px_45px_rgba(58,46,40,0.18)]">
        <div className="absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-ink" />
        <div className="flex aspect-[375/812] flex-col overflow-hidden rounded-[30px] bg-cream">
          {children}
        </div>
      </div>
      <p className="mt-4 text-center text-[12.5px] font-semibold text-ink-soft">{label}</p>
    </div>
  );
}
