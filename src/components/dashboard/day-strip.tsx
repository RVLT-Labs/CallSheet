import { cn } from "@/lib/cn";
import { toIsoDate } from "@/server/availability-rules";

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Next 7 days at a glance (issue #11 scope) — a small dot marks days this person has a shoot on. */
export function DayStrip({ markedDateIsos }: { markedDateIsos: Set<string> }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() + i * 86_400_000));

  return (
    <div className="flex gap-1.5">
      {days.map((date, i) => {
        const dateIso = toIsoDate(date);
        const isToday = i === 0;
        const marked = markedDateIsos.has(dateIso);

        return (
          <div
            key={dateIso}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-md py-2.5",
              isToday ? "bg-burgundy text-white" : "text-ink",
            )}
          >
            <span className={cn("text-[10px] font-bold uppercase", isToday ? "text-white/80" : "text-ink-soft")}>
              {DAY_ABBR[date.getUTCDay()]}
            </span>
            <span className="text-[14px] font-bold">{date.getUTCDate()}</span>
            <span
              className={cn(
                "h-[5px] w-[5px] rounded-full",
                marked ? (isToday ? "bg-white" : "bg-burgundy") : "bg-transparent",
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
