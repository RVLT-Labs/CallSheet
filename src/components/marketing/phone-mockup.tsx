import type { ReactNode } from "react";

/**
 * Chrome-only wrapper for showing a real screen at phone scale on the
 * landing page (design system §1) — never a stock image or fabricated UI,
 * the content passed in is built from the same components as the app.
 */
export function PhoneMockup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="w-[220px] shrink-0">
      <div className="rounded-[28px] border-[6px] border-ink bg-cream p-3 shadow-[0_12px_30px_rgba(58,46,40,0.14)]">
        <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-ink/20" />
        <div className="min-h-[280px] rounded-[14px] bg-white p-3">{children}</div>
      </div>
      <p className="mt-3 text-center text-[11px] font-semibold text-ink-soft">{label}</p>
    </div>
  );
}
