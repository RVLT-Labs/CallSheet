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
  isAmTouched: boolean;
  isPmTouched: boolean;
  onSegmentDown: (dateIso: string, halfDay: "AM" | "PM") => void;
  onSegmentEnter: (dateIso: string, halfDay: "AM" | "PM") => void;
};

function Segment({
  tier,
  touched,
  onPointerDown,
  onPointerEnter,
  label,
}: {
  tier: Tier | null;
  touched: boolean;
  onPointerDown: () => void;
  onPointerEnter: () => void;
  label: string;
}) {
  return (
    <div
      role="button"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      className={cn(
        "h-3.5 w-full first:rounded-t-[4px] last:rounded-b-[4px]",
        tier ? TIER_BG[tier] : "border border-dashed border-hairline bg-cream-deep",
        touched && "ring-2 ring-inset ring-ink",
      )}
    />
  );
}

/** One calendar date: a two-segment AM/PM bar (design system §4.3), tap or drag to paint. */
export function DayCell({ cell, am, pm, isSelected, isAmTouched, isPmTouched, onSegmentDown, onSegmentEnter }: DayCellProps) {
  if (!cell) return <div />;

  const ruleDerived = am?.source === "recurring" || pm?.source === "recurring";

  return (
    <div
      data-date={cell.dateIso}
      className={cn(
        "flex flex-col items-center gap-1 rounded-[6px] p-1",
        isSelected && "bg-cream-deep",
        !cell.inWindow && "opacity-35",
      )}
    >
      <span className="font-mono text-[10px] text-ink-soft">{cell.day}</span>
      <div className="flex w-full flex-col gap-[2px]">
        <Segment
          tier={am?.tier ?? null}
          touched={cell.inWindow && isAmTouched}
          onPointerDown={() => cell.inWindow && onSegmentDown(cell.dateIso, "AM")}
          onPointerEnter={() => cell.inWindow && onSegmentEnter(cell.dateIso, "AM")}
          label={`${cell.dateIso} morning`}
        />
        <Segment
          tier={pm?.tier ?? null}
          touched={cell.inWindow && isPmTouched}
          onPointerDown={() => cell.inWindow && onSegmentDown(cell.dateIso, "PM")}
          onPointerEnter={() => cell.inWindow && onSegmentEnter(cell.dateIso, "PM")}
          label={`${cell.dateIso} afternoon`}
        />
      </div>
      <span
        className={cn("h-1 w-1 rounded-full", ruleDerived ? "bg-ink-faint" : "bg-transparent")}
        aria-hidden
      />
    </div>
  );
}
