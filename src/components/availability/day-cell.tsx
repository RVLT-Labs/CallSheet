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
  isTouched: boolean;
  onPointerDown: (dateIso: string) => void;
  onPointerEnter: (dateIso: string) => void;
};

/**
 * One calendar date, a single click-or-drag target (design system §4.3).
 * The bar still shows AM (top) / PM (bottom) as separate colors when they
 * differ, but tapping/dragging picks the whole day — what to set for each
 * half is chosen afterward in the detail panel, not by hitting a half-day
 * segment directly.
 */
export function DayCell({ cell, am, pm, isSelected, isTouched, onPointerDown, onPointerEnter }: DayCellProps) {
  if (!cell) return <div />;

  const ruleDerived = am?.source === "recurring" || pm?.source === "recurring";

  return (
    <div
      data-date={cell.dateIso}
      role="button"
      aria-label={`${cell.dateIso}${cell.inWindow ? ", set availability" : ""}`}
      onPointerDown={() => cell.inWindow && onPointerDown(cell.dateIso)}
      onPointerEnter={() => cell.inWindow && onPointerEnter(cell.dateIso)}
      className={cn(
        "flex flex-col items-center gap-1 rounded-[6px] p-1",
        isSelected && "bg-cream-deep",
        !cell.inWindow && "opacity-35",
      )}
    >
      <span className="font-mono text-[10px] text-ink-soft">{cell.day}</span>
      <div className={cn("flex w-full flex-col gap-[2px] rounded-[4px]", isTouched && "ring-2 ring-inset ring-ink")}>
        <div
          className={cn(
            "h-3.5 w-full rounded-t-[4px]",
            am ? TIER_BG[am.tier] : "border border-dashed border-hairline bg-cream-deep",
          )}
        />
        <div
          className={cn(
            "h-3.5 w-full rounded-b-[4px]",
            pm ? TIER_BG[pm.tier] : "border border-dashed border-hairline bg-cream-deep",
          )}
        />
      </div>
      <span className={cn("h-1 w-1 rounded-full", ruleDerived ? "bg-ink-faint" : "bg-transparent")} aria-hidden />
    </div>
  );
}
