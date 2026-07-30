import { cn } from "@/lib/cn";

type RoleChipProps = {
  label: string;
  selected: boolean;
  onToggle: () => void;
};

/** Pill-shaped, multi-select (design system §5.2) — people can hold more than one role. */
export function RoleChip({ label, selected, onToggle }: RoleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "rounded-full border px-3.5 py-[7px] text-xs font-semibold",
        selected
          ? "border-burgundy bg-burgundy text-white"
          : "border-hairline bg-white text-ink-soft",
      )}
    >
      {label}
    </button>
  );
}
