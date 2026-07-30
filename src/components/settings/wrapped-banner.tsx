"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

import { reactivateFilm } from "@/app/settings/actions";

function ReactivateSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 text-[11.5px] font-bold text-burgundy disabled:opacity-60"
    >
      {pending ? "Reactivating…" : "Reactivate this film →"}
    </button>
  );
}

export function WrappedBanner() {
  return (
    <div className="mb-5 rounded-xl bg-taupe p-4">
      <p className="mb-0.5 text-[13.5px] font-bold">This film is wrapped</p>
      <p className="text-[11.5px] leading-relaxed text-ink-soft">
        Reminders and nudges are off. Everything below is read-only.
      </p>
      <Link href="/wrapped" className="mt-2 block text-[11.5px] font-bold text-burgundy">
        View wrap summary
      </Link>
      <form action={reactivateFilm}>
        <ReactivateSubmit />
      </form>
    </div>
  );
}
