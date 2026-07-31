import { cn } from "@/lib/cn";
import { TIER_BG, type Tier } from "@/lib/availability-tiers";

export type HalfDayState = { tier: Tier; source: "manual" | "recurring"; ruleLabel: string | null } | null;

export type CalendarCell = {
  dateIso: string;
  day: number;
  inWindow: boolean;
} | null;

type DayCellProps = {
  cell: CalendarCell;
  am: HalfDayState;
  pm: HalfDayState;
  isSelected: boolean;
  isToday: boolean;
  isTouched: boolean;
  onPointerDown: (dateIso: string, shiftKey: boolean) => void;
  onPointerEnter: (dateIso: string) => void;
};

/**
 * One calendar date, a single click-or-drag target (design system §4.3).
 * Laid out like an ordinary month-view calendar cell — date number in the
 * corner, most of the box empty — with the AM/PM tier shown as a pair of
 * small chips along the bottom rather than dominating the cell. Tapping or
 * dragging picks the whole day; which half to set is chosen afterward in
 * the detail panel, not by hitting an AM/PM chip directly.
 */
export function DayCell({ cell, am, pm, isSelected, isToday, isTouched, onPointerDown, onPointerEnter }: DayCellProps) {
  if (!cell) return <div className="border-b border-r border-hairline" />;

  const ruleDerived = am?.source === "recurring" || pm?.source === "recurring";

  return (
    <div
      data-date={cell.dateIso}
      data-in-window={cell.inWindow || undefined}
      role="button"
      aria-label={`${cell.dateIso}${cell.inWindow ? ", set availability" : ""}`}
      onPointerDown={(e) => {
        if (!cell.inWindow) return;
        onPointerDown(cell.dateIso, e.shiftKey);
      }}
      onPointerEnter={() => cell.inWindow && onPointerEnter(cell.dateIso)}
      className={cn(
        "flex min-h-[68px] flex-col gap-2 border-b border-r border-hairline p-1.5 sm:min-h-[86px] sm:p-2",
        isSelected && "bg-cream-deep",
        !cell.inWindow && "opacity-35",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] text-ink-soft",
            isToday && "bg-burgundy font-bold text-white",
          )}
        >
          {cell.day}
        </span>
        <span className={cn("h-1.5 w-1.5 rounded-full", ruleDerived ? "bg-ink-faint" : "bg-transparent")} aria-hidden />
      </div>
      <div
        className={cn(
          "mt-auto flex gap-1 rounded-[5px]",
          isTouched && "-m-1 ring-2 ring-inset ring-ink p-1",
        )}
      >
        <div
          className={cn(
            "h-2.5 flex-1 rounded-[3px]",
            am ? TIER_BG[am.tier] : "border border-dashed border-hairline",
          )}
        />
        <div
          className={cn(
            "h-2.5 flex-1 rounded-[3px]",
            pm ? TIER_BG[pm.tier] : "border border-dashed border-hairline",
          )}
        />
      </div>
    </div>
  );
}
