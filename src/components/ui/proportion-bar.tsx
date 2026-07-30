import { cn } from "@/lib/cn";
import type { StatusTone } from "@/components/ui/status-dot";

const toneClasses: Record<StatusTone, string> = {
  forest: "bg-forest",
  terracotta: "bg-terracotta",
  burgundy: "bg-burgundy",
  taupe: "bg-taupe",
  "ink-faint": "bg-ink-faint",
};

export type ProportionSegment = {
  tone: StatusTone;
  label: string;
  count: number;
};

type ProportionBarProps = {
  segments: ProportionSegment[];
  showLegend?: boolean;
};

/**
 * Thin (6px) segmented bar for RSVP counts or availability ratios (design
 * system §5.3) — replaces stacking colored words next to a label. Zero-count
 * segments are omitted so the bar never renders a hairline sliver.
 */
export function ProportionBar({ segments, showLegend = true }: ProportionBarProps) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  const visible = segments.filter((s) => s.count > 0);

  return (
    <div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-hairline">
        {visible.map((s, i) => (
          <div
            key={i}
            className={toneClasses[s.tone]}
            style={{ width: total > 0 ? `${(s.count / total) * 100}%` : 0 }}
          />
        ))}
      </div>
      {showLegend && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
          {visible.map((s, i) => (
            <span key={i} className={cn("flex items-center gap-1.5")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", toneClasses[s.tone])} />
              {s.label} {s.count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
