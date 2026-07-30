import Link from "next/link";

import { FilmThumb } from "@/components/film-picker/film-thumb";
import type { Membership } from "@/server/memberships";

type FilmPickerListProps = {
  active: Membership[];
  wrapped: Membership[];
  activeOrganizationId: string | null;
  onSelect: (organizationId: string) => void;
};

/**
 * Shared list content for both the mobile bottom sheet and desktop dropdown
 * (design system §5.7 — same content, different chrome). Active/wrapped
 * grouped, per-film role shown, "create a new film" row at the bottom of
 * the same list rather than a separate button elsewhere.
 */
export function FilmPickerList({ active, wrapped, activeOrganizationId, onSelect }: FilmPickerListProps) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Active</p>
      {active.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onSelect(m.organization.id)}
          className="flex w-full items-center gap-3 border-b border-hairline py-3 text-left last:border-b-0"
        >
          <FilmThumb name={m.organization.name} />
          <span className="flex-1">
            <span className="block text-sm font-semibold">{m.organization.name}</span>
            <span className="block text-[10px] font-bold uppercase tracking-wide text-burgundy">
              {m.role === "member" ? "Crew" : "Organiser"}
            </span>
          </span>
          {m.organization.id === activeOrganizationId && (
            <span aria-hidden className="text-burgundy">
              ✓
            </span>
          )}
        </button>
      ))}

      {wrapped.length > 0 && (
        <>
          <p className="mb-1 mt-4 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Wrapped</p>
          {wrapped.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m.organization.id)}
              className="flex w-full items-center gap-3 border-b border-hairline py-3 text-left last:border-b-0"
            >
              <FilmThumb name={m.organization.name} wrapped />
              <span className="flex-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
                  {m.organization.name}
                  <span className="rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-ink-faint bg-taupe">
                    Wrapped
                  </span>
                </span>
              </span>
            </button>
          ))}
        </>
      )}

      <Link
        href="/films/new"
        className="mt-2 flex items-center gap-3 pt-3 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-hairline text-lg text-ink-faint">
          +
        </span>
        <span className="text-[13.5px] font-semibold text-ink-soft">Create a new film</span>
      </Link>
    </div>
  );
}
