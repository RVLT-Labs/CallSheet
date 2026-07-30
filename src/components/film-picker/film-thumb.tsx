import { cn } from "@/lib/cn";

const PALETTE = ["bg-burgundy", "bg-terracotta", "bg-forest", "bg-ink"] as const;

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/** Square film thumbnail (film-picker specific — not the circular Avatar). */
export function FilmThumb({ name, wrapped, size = "md" }: { name: string; wrapped?: boolean; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[10px] font-bold text-white",
        size === "md" ? "h-10 w-10 text-[15px]" : "h-8 w-8 text-[13px]",
        wrapped ? "bg-taupe text-ink-soft" : colorFor(name),
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
