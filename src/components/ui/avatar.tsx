import { cn } from "@/lib/cn";

const PALETTE = ["bg-burgundy", "bg-terracotta", "bg-forest", "bg-ink"] as const;

/** Deterministic color pick so the same person always gets the same avatar color. */
function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

type AvatarProps = {
  name: string;
  size?: "sm" | "lg";
  /** Adds a burgundy ring, e.g. to mark the current page in a nav. */
  ring?: boolean;
};

/** Circular, filled with an identity color, initials in white (design system §5.4). */
export function Avatar({ name, size = "sm", ring = false }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold text-white",
        colorFor(name),
        size === "sm" ? "h-[30px] w-[30px] text-[13px]" : "h-[52px] w-[52px] text-lg",
        ring && "ring-2 ring-burgundy ring-offset-2 ring-offset-cream",
      )}
    >
      {initials(name)}
    </span>
  );
}
