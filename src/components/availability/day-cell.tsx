import { cn } from "@/lib/cn";
import { BLOCK_TYPE_BG, type BlockType } from "@/lib/availability-blocks";

export type DayCellBlockSummary = { blockType: BlockType; source: "manual" | "recurring" };

export type CalendarCell = {
  dateIso: string;
  day: number;
  inWindow: boolean;
} | null;

type DayCellProps = {
  cell: CalendarCell;
  blocks: DayCellBlockSummary[];
  isSelected: boolean;
  isToday: boolean;
  onSelect: (dateIso: string) => void;
};

/**
 * One calendar date (design system §4.3). Date number in the corner, a
 * small bar along the bottom shows hard/soft blocks for the day — solid
 * burgundy for any hard block, terracotta for soft, dashed outline for a
 * fully free day. A faint dot marks a day still governed by a recurring rule.
 */
export function DayCell({ cell, blocks, isSelected, isToday, onSelect }: DayCellProps) {
  if (!cell) return <div className="border-b border-r border-hairline" />;

  const hasHard = blocks.some((b) => b.blockType === "hard");
  const hasSoft = blocks.some((b) => b.blockType === "soft");
  const ruleDerived = blocks.some((b) => b.source === "recurring");

  return (
    <button
      type="button"
      data-date={cell.dateIso}
      disabled={!cell.inWindow}
      aria-label={`${cell.dateIso}${cell.inWindow ? ", edit availability" : ""}`}
      onClick={() => cell.inWindow && onSelect(cell.dateIso)}
      className={cn(
        "flex min-h-[68px] flex-col gap-2 border-b border-r border-hairline p-1.5 text-left sm:min-h-[86px] sm:p-2",
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
      <div className="mt-auto flex gap-1 rounded-[5px]">
        {!hasHard && !hasSoft ? (
          <div className="h-2.5 flex-1 rounded-[3px] border border-dashed border-hairline" />
        ) : (
          <>
            {hasHard && <div className={cn("h-2.5 flex-1 rounded-[3px]", BLOCK_TYPE_BG.hard)} />}
            {hasSoft && <div className={cn("h-2.5 flex-1 rounded-[3px]", BLOCK_TYPE_BG.soft)} />}
          </>
        )}
      </div>
    </button>
  );
}
