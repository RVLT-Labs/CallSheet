import { cn } from "@/lib/cn";

export type StatusTone = "forest" | "terracotta" | "burgundy" | "taupe" | "ink-faint";

const toneClasses: Record<StatusTone, string> = {
  forest: "bg-forest",
  terracotta: "bg-terracotta",
  burgundy: "bg-burgundy",
  taupe: "bg-taupe",
  "ink-faint": "bg-ink-faint",
};

type StatusDotProps = {
  tone: StatusTone;
  label: string;
};

/**
 * The default way to show a status inline (design system §5.3) — preferred
 * over pills/badges for anything repeated in a list. Mapping: Best/Accepted
 * -> forest, OK/Tentative -> terracotta, Unavailable/Declined -> burgundy,
 * Unknown/Pending/Wrapped -> taupe or ink-faint.
 */
export function StatusDot({ tone, label }: StatusDotProps) {
  return (
    <span className="flex items-center gap-2 text-[13px]">
      <span className={cn("h-[7px] w-[7px] rounded-full", toneClasses[tone])} />
      {label}
    </span>
  );
}

/** A small burgundy dot next to an avatar (design system §5.3) — not an overlapping badge. */
export function RequiredMarker() {
  return (
    <span
      aria-label="Required"
      className="inline-block h-[5px] w-[5px] rounded-full bg-burgundy"
    />
  );
}
