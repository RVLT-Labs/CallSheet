import { cn } from "@/lib/cn";

export type PillRowOption<T extends string> = {
  value: T;
  label: string;
};

type PillRowProps<T extends string> = {
  options: PillRowOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
};

/**
 * For 2-3 options that read better as buttons than plain text (design
 * system §5.2) — e.g. Single day/Multi-day, Morning/Afternoon/Either.
 */
export function PillRow<T extends string>({
  options,
  value,
  onChange,
  ...props
}: PillRowProps<T>) {
  return (
    <div
      className="inline-flex gap-1 rounded-md border border-hairline bg-white p-1"
      role="radiogroup"
      aria-label={props["aria-label"]}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-[9px] px-4 py-2 text-xs font-semibold",
              selected ? "bg-ink text-white" : "text-ink-soft",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
