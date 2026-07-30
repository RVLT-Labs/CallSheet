"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { FilmPickerList } from "@/components/film-picker/film-picker-list";
import { Sheet } from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import type { Membership } from "@/server/memberships";

type FilmPickerProps = {
  active: Membership[];
  wrapped: Membership[];
  activeOrganizationId: string | null;
  activeFilmName: string;
};

/**
 * Triggered by tapping the wordmark/film name itself (design system §5.6) —
 * no separate menu icon. Mobile: bottom sheet. Desktop: dropdown anchored
 * under the trigger (not the centered Sheet modal — this is its own
 * anchored-popover pattern per style-board-v14-film-picker.html).
 */
export function FilmPicker({ active, wrapped, activeOrganizationId, activeFilmName }: FilmPickerProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleSelect(organizationId: string) {
    setOpen(false);
    if (organizationId !== activeOrganizationId) {
      await authClient.organization.setActive({ organizationId });
    }
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5"
      >
        <span className="font-display text-2xl font-bold italic text-burgundy">
          {activeFilmName}
        </span>
        <span className={cn("text-ink-soft transition-transform", open && "rotate-180")} aria-hidden>
          ▾
        </span>
      </button>

      {/* Mobile: bottom sheet */}
      <div className="md:hidden">
        <Sheet open={open} onClose={() => setOpen(false)} title="Switch film">
          <FilmPickerList
            active={active}
            wrapped={wrapped}
            activeOrganizationId={activeOrganizationId}
            onSelect={handleSelect}
          />
        </Sheet>
      </div>

      {/* Desktop: anchored dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 hidden w-72 rounded-md border border-hairline bg-cream p-3.5 shadow-[0_10px_30px_rgba(58,46,40,0.15)] md:block">
          <FilmPickerList
            active={active}
            wrapped={wrapped}
            activeOrganizationId={activeOrganizationId}
            onSelect={handleSelect}
          />
        </div>
      )}
    </div>
  );
}
