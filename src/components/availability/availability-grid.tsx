"use client";

import { useMemo, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { RoleChip } from "@/components/ui/role-chip";
import { cn } from "@/lib/cn";
import { TIER_BG, TIER_LABEL, type Tier } from "@/lib/availability-tiers";
import type { CrewAvailabilityRow } from "@/server/availability-grid";
import { parseIsoDateUtc, toIsoDate } from "@/server/availability-rules";

type AvailabilityGridProps = {
  crew: CrewAvailabilityRow[];
  windowStart: string;
  windowEnd: string;
  requiredMembershipIds: string[];
};

function allDatesInRange(startIso: string, endIso: string) {
  const dates: string[] = [];
  const end = parseIsoDateUtc(endIso);
  for (let d = parseIsoDateUtc(startIso); d <= end; d = new Date(d.getTime() + 86_400_000)) {
    dates.push(toIsoDate(d));
  }
  return dates;
}

function Swatch({ tier }: { tier: Tier | null }) {
  return (
    <div className={cn("h-3 w-full", tier ? TIER_BG[tier] : "border border-dashed border-hairline bg-cream-deep")} />
  );
}

export function AvailabilityGrid({ crew, windowStart, windowEnd, requiredMembershipIds }: AvailabilityGridProps) {
  const dates = useMemo(() => allDatesInRange(windowStart, windowEnd), [windowStart, windowEnd]);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set(crew.map((c) => c.membershipId)));
  const [activeCell, setActiveCell] = useState<{ dateIso: string; halfDay: "AM" | "PM" } | null>(null);
  const requiredSet = useMemo(() => new Set(requiredMembershipIds), [requiredMembershipIds]);

  function toggleCrew(membershipId: string) {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(membershipId)) next.delete(membershipId);
      else next.add(membershipId);
      return next;
    });
  }

  const visibleCrew = crew.filter((c) => visibleIds.has(c.membershipId));

  const dayLookup = useMemo(() => {
    const map = new Map<string, Map<string, { am: Tier | null; pm: Tier | null }>>();
    for (const row of crew) {
      const byDate = new Map<string, { am: Tier | null; pm: Tier | null }>();
      for (const day of row.days) {
        byDate.set(day.dateIso, { am: day.am?.tier ?? null, pm: day.pm?.tier ?? null });
      }
      map.set(row.membershipId, byDate);
    }
    return map;
  }, [crew]);

  const breakdown = useMemo(() => {
    if (!activeCell) return null;
    const groups: Record<"best" | "ok" | "unavailable" | "unknown", string[]> = {
      best: [],
      ok: [],
      unavailable: [],
      unknown: [],
    };
    for (const row of visibleCrew) {
      const tier = dayLookup.get(row.membershipId)?.get(activeCell.dateIso)?.[activeCell.halfDay === "AM" ? "am" : "pm"];
      groups[tier ?? "unknown"].push(row.name);
    }
    return groups;
  }, [activeCell, visibleCrew, dayLookup]);

  return (
    <div>
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Filter crew</p>
      <div className="mb-6 flex flex-wrap gap-2">
        {crew.map((c) => (
          <RoleChip key={c.membershipId} label={c.name} selected={visibleIds.has(c.membershipId)} onToggle={() => toggleCrew(c.membershipId)} />
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex">
            <div className="w-36 shrink-0" />
            {dates.map((dateIso) => {
              const date = parseIsoDateUtc(dateIso);
              return (
                <div key={dateIso} className="w-9 shrink-0 text-center">
                  <p className="font-mono text-[9px] text-ink-soft">{date.getUTCDate()}</p>
                  <div className="flex flex-col gap-[1px]">
                    <button
                      type="button"
                      onClick={() => setActiveCell({ dateIso, halfDay: "AM" })}
                      aria-label={`${dateIso} morning breakdown`}
                      className={cn(
                        "h-2 w-full",
                        activeCell?.dateIso === dateIso && activeCell.halfDay === "AM" && "ring-1 ring-ink",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setActiveCell({ dateIso, halfDay: "PM" })}
                      aria-label={`${dateIso} afternoon breakdown`}
                      className={cn(
                        "h-2 w-full",
                        activeCell?.dateIso === dateIso && activeCell.halfDay === "PM" && "ring-1 ring-ink",
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {visibleCrew.map((row) => (
            <div key={row.membershipId} className="flex items-center border-t border-hairline py-1.5">
              <div className="flex w-36 shrink-0 items-center gap-2">
                <span className="relative">
                  <Avatar name={row.name} />
                  {requiredSet.has(row.membershipId) && (
                    <span
                      aria-label="Required"
                      className="absolute -right-0.5 -top-0.5 h-[6px] w-[6px] rounded-full bg-burgundy"
                    />
                  )}
                </span>
                <span className="truncate text-[12px] font-medium">{row.name}</span>
              </div>
              {dates.map((dateIso) => {
                const cell = dayLookup.get(row.membershipId)?.get(dateIso);
                return (
                  <div key={dateIso} className="flex w-9 shrink-0 flex-col gap-[1px] px-[1px]">
                    <Swatch tier={cell?.am ?? null} />
                    <Swatch tier={cell?.pm ?? null} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {activeCell && breakdown && (
        <div className="mt-6 rounded-md border border-hairline bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[12.5px] font-semibold">
              {parseIsoDateUtc(activeCell.dateIso).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              })}{" "}
              · {activeCell.halfDay === "AM" ? "Morning" : "Afternoon"}
            </p>
            <button type="button" onClick={() => setActiveCell(null)} className="text-[12px] text-ink-soft">
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {(["best", "ok", "unavailable", "unknown"] as const).map((tier) => (
              <div key={tier}>
                <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
                  {tier === "unknown" ? "Unknown" : TIER_LABEL[tier]} ({breakdown[tier].length})
                </p>
                {breakdown[tier].length === 0 ? (
                  <p className="text-[11px] italic text-ink-faint">None</p>
                ) : (
                  breakdown[tier].map((name) => (
                    <p key={name} className="text-[12px]">
                      {name}
                    </p>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
