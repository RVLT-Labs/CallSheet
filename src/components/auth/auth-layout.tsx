import type { ReactNode } from "react";

/**
 * Centered flow, full width on mobile (no card chrome — matches
 * style-board-v12-auth-profile.html); a bordered white card centered on a
 * wide canvas on desktop (style-board-v12-desktop.html §"auth-card": "not
 * a stretched full-width form").
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm md:rounded-lg md:border md:border-hairline md:bg-white md:p-11 md:shadow-[0_10px_30px_rgba(58,46,40,0.08)]">
        {children}
      </div>
    </div>
  );
}
