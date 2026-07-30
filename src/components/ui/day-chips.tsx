import { cn } from "@/lib/cn";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

type DayChipsProps = {
  selected: boolean[]; // length 7, index 0 = Sunday
  onToggle: (dayIndex: number) => void;
};

/**
 * Circular day-of-week toggles (design system §5.2) — used for recurring
 * availability rules. Confirmed via Mobbin research (Timepage/PayPal/ClickUp
 * all use this pattern).
 */
export function DayChips({ selected, onToggle }: DayChipsProps) {
  return (
    <div className="flex gap-1.5" role="group" aria-label="Days of the week">
      {DAY_LABELS.map((label, i) => (
        <button
          key={i}
          type="button"
          aria-pressed={selected[i]}
          aria-label={
            ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i]
          }
          onClick={() => onToggle(i)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold",
            selected[i]
              ? "border-burgundy bg-burgundy text-white"
              : "border-hairline bg-white text-ink-soft",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
