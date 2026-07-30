"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { CloseIcon } from "@/components/ui/icons";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/**
 * Shared bottom-sheet (mobile) / centered-modal (desktop) container (design
 * system §5.7) — same content, different chrome. Every "extra content"
 * surface (recurring-rule editor, per-person detail, film picker) should
 * compose this rather than one-off its own overlay.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 md:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-lg bg-cream p-5 shadow-[0_2px_8px_rgba(58,46,40,0.05)] md:max-w-md md:rounded-lg"
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-hairline md:hidden" />
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="font-semibold text-ink">{title}</h2>}
          <button type="button" aria-label="Close" onClick={onClose} className="ml-auto">
            <CloseIcon className="h-5 w-5 stroke-ink-soft" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
