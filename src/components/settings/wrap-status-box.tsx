"use client";

import { useFormStatus } from "react-dom";

import { wrapFilm } from "@/app/settings/actions";

function WrapSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md border border-burgundy py-[11px] text-center text-[12.5px] font-semibold text-burgundy disabled:opacity-60"
    >
      {pending ? "Wrapping…" : "Wrap this film"}
    </button>
  );
}

/**
 * Outline burgundy, not filled destructive-red (design system note) —
 * wrapping is consequential but not destructive, nothing is deleted.
 */
export function WrapStatusBox() {
  return (
    <div className="mt-1.5 rounded-xl border border-hairline bg-white p-4">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-forest">● Active</p>
      <p className="mb-3 text-xs leading-relaxed text-ink-soft">
        Wrapping stops availability reminders and RSVP nudges. Nothing is deleted — the film stays visible and
        read-only.
      </p>
      <form action={wrapFilm}>
        <WrapSubmit />
      </form>
    </div>
  );
}
