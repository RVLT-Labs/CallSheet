import { cn } from "@/lib/cn";

export type OptTone = "forest" | "terracotta" | "burgundy" | "ink";

const toneClasses: Record<OptTone, string> = {
  forest: "text-forest after:bg-forest",
  terracotta: "text-terracotta after:bg-terracotta",
  burgundy: "text-burgundy after:bg-burgundy",
  ink: "text-ink after:bg-ink",
};

export type OptGroupOption<T extends string> = {
  value: T;
  label: string;
  tone: OptTone;
};

type OptGroupProps<T extends string> = {
  options: OptGroupOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  "aria-label": string;
};

/**
 * The single most reused control in the design system (§5.2) — availability
 * tiers, shoot-planning crew status, all share this pattern. Unselected
 * options are always ink-faint; selected color + underline come from `tone`.
 */
export function OptGroup<T extends string>({
  options,
  value,
  onChange,
  ...props
}: OptGroupProps<T>) {
  return (
    <div className="flex gap-4" role="radiogroup" aria-label={props["aria-label"]}>
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
              "relative pb-1 text-[13px] font-semibold after:absolute after:inset-x-0 after:bottom-0 after:h-0.5",
              selected ? toneClasses[opt.tone] : "text-ink-faint after:bg-transparent",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
