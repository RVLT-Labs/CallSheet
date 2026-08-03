"use client";

import { useMemo, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { RoleChip } from "@/components/ui/role-chip";
import { TextField } from "@/components/ui/text-field";
import { cn } from "@/lib/cn";
import type { DayCellBlock } from "@/server/availability";
import type { CrewAvailabilityRow } from "@/server/availability-grid";
import { parseIsoDateUtc, toIsoDate } from "@/server/availability-rules";

export type ShootFilterOption = {
  id: string;
  label: string;
  status: "tentative" | "confirmed";
  dateIsos: string[];
  requiredMembershipIds: string[];
};

type AvailabilityGridProps = {
  crew: CrewAvailabilityRow[];
  windowStart: string;
  windowEnd: string;
  requiredMembershipIds: string[];
  shoots: ShootFilterOption[];
};

const DAY_COLUMN_WIDTH_PX = 20;

type DayVerdict = "hard" | "soft" | "free";

function verdictFor(blocks: DayCellBlock[]): DayVerdict {
  if (blocks.some((b) => b.blockType === "hard")) return "hard";
  if (blocks.some((b) => b.blockType === "soft")) return "soft";
  return "free";
}

const VERDICT_BG: Record<DayVerdict, string> = { hard: "bg-burgundy", soft: "bg-terracotta", free: "bg-cream-deep" };
const VERDICT_LABEL: Record<DayVerdict, string> = { hard: "Hard blocked", soft: "Soft blocked", free: "Free" };

function allDatesInRange(startIso: string, endIso: string) {
  const dates: string[] = [];
  const end = parseIsoDateUtc(endIso);
  for (let d = parseIsoDateUtc(startIso); d <= end; d = new Date(d.getTime() + 86_400_000)) {
    dates.push(toIsoDate(d));
  }
  return dates;
}

/** Groups a sorted date list into contiguous same-month runs, so long windows (a film can run for months) read as blocks instead of one undifferentiated line. */
function groupByMonth(dates: string[]) {
  const groups: { label: string; count: number }[] = [];
  for (const dateIso of dates) {
    const label = parseIsoDateUtc(dateIso).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.count += 1;
    else groups.push({ label, count: 1 });
  }
  return groups;
}

function Swatch({ verdict }: { verdict: DayVerdict }) {
  return <div className={cn("h-3 w-full", verdict === "free" ? "border border-dashed border-hairline" : VERDICT_BG[verdict])} />;
}

export function AvailabilityGrid({ crew, windowStart, windowEnd, requiredMembershipIds, shoots }: AvailabilityGridProps) {
  const fullWindowDates = useMemo(() => allDatesInRange(windowStart, windowEnd), [windowStart, windowEnd]);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set(crew.map((c) => c.membershipId)));
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedShootId, setSelectedShootId] = useState<string>("");

  const selectedShoot = shoots.find((s) => s.id === selectedShootId) ?? null;
  const dates = useMemo(
    () => (selectedShoot ? [...selectedShoot.dateIsos].sort() : fullWindowDates),
    [selectedShoot, fullWindowDates],
  );
  const monthGroups = useMemo(() => groupByMonth(dates), [dates]);

  const requiredSet = useMemo(
    () => new Set(selectedShoot ? selectedShoot.requiredMembershipIds : requiredMembershipIds),
    [selectedShoot, requiredMembershipIds],
  );

  function toggleCrew(membershipId: string) {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      if (next.has(membershipId)) next.delete(membershipId);
      else next.add(membershipId);
      return next;
    });
  }

  const searchLower = search.trim().toLowerCase();
  const chipCrew = useMemo(
    () =>
      crew.filter(
        (c) =>
          !searchLower ||
          c.name.toLowerCase().includes(searchLower) ||
          c.roleTags.some((tag) => tag.toLowerCase().includes(searchLower)),
      ),
    [crew, searchLower],
  );
  const visibleCrew = useMemo(
    () => chipCrew.filter((c) => visibleIds.has(c.membershipId)),
    [chipCrew, visibleIds],
  );

  const dayLookup = useMemo(() => {
    const map = new Map<string, Map<string, DayCellBlock[]>>();
    for (const row of crew) {
      const byDate = new Map<string, DayCellBlock[]>();
      for (const day of row.days) byDate.set(day.dateIso, day.blocks);
      map.set(row.membershipId, byDate);
    }
    return map;
  }, [crew]);

  const breakdown = useMemo(() => {
    if (!activeDate) return null;
    const groups: Record<DayVerdict, string[]> = { hard: [], soft: [], free: [] };
    for (const row of visibleCrew) {
      const blocks = dayLookup.get(row.membershipId)?.get(activeDate) ?? [];
      groups[verdictFor(blocks)].push(row.name);
    }
    return groups;
  }, [activeDate, visibleCrew, dayLookup]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="min-w-[220px] flex-1">
          <TextField
            label="Search crew"
            placeholder="Name or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {shoots.length > 0 && (
          <div className="mb-[18px] min-w-[220px] flex-1">
            <label htmlFor="shoot-filter" className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
              Filter by shoot
            </label>
            <select
              id="shoot-filter"
              value={selectedShootId}
              onChange={(e) => setSelectedShootId(e.target.value)}
              className="w-full border-0 border-b-[1.5px] border-hairline bg-transparent py-2 text-[13.5px] text-ink focus:border-burgundy focus:outline-none"
            >
              <option value="">All dates</option>
              {shoots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} · {s.status === "tentative" ? "Tentative" : "Confirmed"}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Filter crew</p>
        <div className="flex gap-3 text-[11.5px] font-semibold text-burgundy">
          <button type="button" onClick={() => setVisibleIds(new Set(crew.map((c) => c.membershipId)))}>
            Show all
          </button>
          <button type="button" onClick={() => setVisibleIds(new Set())}>
            Hide all
          </button>
        </div>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {chipCrew.length === 0 && <p className="text-[12.5px] italic text-ink-faint">No crew match &quot;{search}&quot;.</p>}
        {chipCrew.map((c) => (
          <RoleChip key={c.membershipId} label={c.name} selected={visibleIds.has(c.membershipId)} onToggle={() => toggleCrew(c.membershipId)} />
        ))}
      </div>

      {dates.length === 0 ? (
        <p className="text-[13px] text-ink-soft">This shoot has no dates set.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex">
              <div className="w-36 shrink-0" />
              {monthGroups.map((group, i) => (
                <div
                  key={`${group.label}-${i}`}
                  style={{ width: group.count * DAY_COLUMN_WIDTH_PX }}
                  className={cn(
                    "shrink-0 truncate pb-1 pl-1 text-[10px] font-bold uppercase tracking-wide text-ink-soft",
                    i > 0 && "border-l border-hairline",
                  )}
                >
                  {group.label}
                </div>
              ))}
            </div>
            <div className="flex">
              <div className="w-36 shrink-0" />
              {dates.map((dateIso) => {
                const date = parseIsoDateUtc(dateIso);
                return (
                  <div key={dateIso} className="shrink-0 text-center" style={{ width: DAY_COLUMN_WIDTH_PX }}>
                    <p className="font-mono text-[9px] text-ink-soft">{date.getUTCDate()}</p>
                    <button
                      type="button"
                      onClick={() => setActiveDate(dateIso)}
                      aria-label={`${dateIso} breakdown`}
                      className={cn("h-2 w-full", activeDate === dateIso && "ring-1 ring-ink")}
                    />
                  </div>
                );
              })}
            </div>

            {visibleCrew.length === 0 && (
              <p className="border-t border-hairline py-6 text-center text-[12.5px] text-ink-soft">
                No crew to show. Adjust the search or filter above.
              </p>
            )}

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
                {dates.map((dateIso) => (
                  <div key={dateIso} className="shrink-0 px-[1px]" style={{ width: DAY_COLUMN_WIDTH_PX }}>
                    <Swatch verdict={verdictFor(dayLookup.get(row.membershipId)?.get(dateIso) ?? [])} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeDate && breakdown && (
        <div className="mt-6 rounded-md border border-hairline bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[12.5px] font-semibold">
              {parseIsoDateUtc(activeDate).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              })}
            </p>
            <button type="button" onClick={() => setActiveDate(null)} className="text-[12px] text-ink-soft">
              Close
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {(["free", "soft", "hard"] as const).map((verdict) => (
              <div key={verdict}>
                <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
                  {VERDICT_LABEL[verdict]} ({breakdown[verdict].length})
                </p>
                {breakdown[verdict].length === 0 ? (
                  <p className="text-[11px] italic text-ink-faint">None</p>
                ) : (
                  breakdown[verdict].map((name) => (
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
