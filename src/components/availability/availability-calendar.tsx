"use client";

import { useMemo, useState } from "react";

import { OptGroup } from "@/components/ui/opt-group";
import { ChevronRightIcon } from "@/components/ui/icons";
import { CalendarCell, DayCell, type HalfDayState } from "@/components/availability/day-cell";
import { RecurringRulesSection, type RuleRow } from "@/components/availability/recurring-rules-section";
import { TIER_OPTIONS, type Tier } from "@/lib/availability-tiers";
import { setBulkTier, setDayTier } from "@/app/availability/actions";
import { parseIsoDateUtc, toIsoDate, utcDate } from "@/server/availability-rules";

type DayCellData = { dateIso: string; am: HalfDayState; pm: HalfDayState };

type AvailabilityCalendarProps = {
  windowStart: string;
  windowEnd: string;
  days: DayCellData[];
  rules: RuleRow[];
};

function buildMonthWeeks(year: number, month: number, windowStart: string, windowEnd: string) {
  const firstOfMonth = utcDate(year, month, 1);
  const startWeekday = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateIso = toIsoDate(utcDate(year, month, d));
    cells.push({ dateIso, day: d, inWindow: dateIso >= windowStart && dateIso <= windowEnd });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function AvailabilityCalendar({ windowStart, windowEnd, days, rules }: AvailabilityCalendarProps) {
  const startDate = parseIsoDateUtc(windowStart);
  const endDate = parseIsoDateUtc(windowEnd);

  const [viewYear, setViewYear] = useState(startDate.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(startDate.getUTCMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [dragStartedFresh, setDragStartedFresh] = useState(true);
  const [bulkSelection, setBulkSelection] = useState<{ dateIso: string; halfDay: "AM" | "PM" }[] | null>(null);
  const [pending, setPending] = useState(false);

  const daysByIso = useMemo(() => new Map(days.map((d) => [d.dateIso, d])), [days]);

  const weeks = useMemo(
    () => buildMonthWeeks(viewYear, viewMonth, windowStart, windowEnd),
    [viewYear, viewMonth, windowStart, windowEnd],
  );

  const canGoPrev = utcDate(viewYear, viewMonth, 1) > utcDate(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1);
  const canGoNext = utcDate(viewYear, viewMonth, 1) < utcDate(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1);

  function changeMonth(delta: number) {
    const next = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth());
  }

  function segmentKey(dateIso: string, halfDay: "AM" | "PM") {
    return `${dateIso}|${halfDay}`;
  }

  function onSegmentDown(dateIso: string, halfDay: "AM" | "PM") {
    setDragging(true);
    setDragStartedFresh(true);
    setTouched(new Set([segmentKey(dateIso, halfDay)]));
    setBulkSelection(null);
  }

  function onSegmentEnter(dateIso: string, halfDay: "AM" | "PM") {
    if (!dragging) return;
    setDragStartedFresh(false);
    setTouched((prev) => {
      const next = new Set(prev);
      next.add(segmentKey(dateIso, halfDay));
      return next;
    });
  }

  function endDrag() {
    if (!dragging) return;
    setDragging(false);

    if (touched.size === 1) {
      const [key] = touched;
      const [dateIso] = key.split("|");
      setSelectedDate(dateIso);
      setBulkSelection(null);
    } else if (touched.size > 1) {
      const cells = [...touched].map((key) => {
        const [dateIso, halfDay] = key.split("|") as [string, "AM" | "PM"];
        return { dateIso, halfDay };
      });
      setBulkSelection(cells);
      setSelectedDate(null);
    }
    setTouched(new Set());
  }

  function markWeek(week: CalendarCell[]) {
    const cells = week
      .filter((c): c is Exclude<CalendarCell, null> => !!c && c.inWindow)
      .flatMap((c) => [
        { dateIso: c.dateIso, halfDay: "AM" as const },
        { dateIso: c.dateIso, halfDay: "PM" as const },
      ]);
    if (cells.length === 0) return;
    setBulkSelection(cells);
    setSelectedDate(null);
  }

  async function applyBulkTier(tier: Tier) {
    if (!bulkSelection) return;
    setPending(true);
    await setBulkTier(bulkSelection, tier);
    setPending(false);
    setBulkSelection(null);
  }

  async function applyDayTier(halfDay: "AM" | "PM", tier: Tier) {
    if (!selectedDate) return;
    setPending(true);
    await setDayTier(selectedDate, halfDay, tier);
    setPending(false);
  }

  const selectedDay = selectedDate ? daysByIso.get(selectedDate) : undefined;
  const selectedRuleAm = selectedDay?.am?.source === "recurring" ? selectedDay.am : null;
  const selectedRulePm = selectedDay?.pm?.source === "recurring" ? selectedDay.pm : null;

  return (
    <div onPointerUp={endDrag} onPointerLeave={dragStartedFresh ? undefined : endDrag} className="touch-none select-none">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canGoPrev}
          onClick={() => changeMonth(-1)}
          className="rotate-180 disabled:opacity-30"
        >
          <ChevronRightIcon className="h-4 w-4 stroke-ink-soft" />
        </button>
        <span className="text-[13px] font-bold">
          {new Date(Date.UTC(viewYear, viewMonth, 1)).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </span>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canGoNext}
          onClick={() => changeMonth(1)}
          className="disabled:opacity-30"
        >
          <ChevronRightIcon className="h-4 w-4 stroke-ink-soft" />
        </button>
      </div>

      {days.length === 0 && rules.length === 0 && (
        <p className="mb-3 text-[12.5px] text-ink-soft">
          Nothing set yet. Tap a day below to mark yourself Best, OK, or Unavailable.
        </p>
      )}

      <div className="grid grid-cols-7 gap-1 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="text-[10px] font-bold uppercase text-ink-faint">
            {d}
          </span>
        ))}
      </div>

      {weeks.map((week, i) => (
        <div key={i} className="mt-1 flex items-center gap-1">
          <div className="grid flex-1 grid-cols-7 gap-1">
            {week.map((cell, j) => (
              <DayCell
                key={cell?.dateIso ?? `blank-${i}-${j}`}
                cell={cell}
                am={cell ? daysByIso.get(cell.dateIso)?.am ?? null : null}
                pm={cell ? daysByIso.get(cell.dateIso)?.pm ?? null : null}
                isSelected={cell?.dateIso === selectedDate}
                isAmTouched={!!cell && touched.has(segmentKey(cell.dateIso, "AM"))}
                isPmTouched={!!cell && touched.has(segmentKey(cell.dateIso, "PM"))}
                onSegmentDown={onSegmentDown}
                onSegmentEnter={onSegmentEnter}
              />
            ))}
          </div>
          {week.some((c) => c?.inWindow) && (
            <button
              type="button"
              onClick={() => markWeek(week)}
              className="w-11 shrink-0 text-[9.5px] font-semibold leading-tight text-burgundy"
            >
              Mark week
            </button>
          )}
        </div>
      ))}

      <div className="mt-3 flex items-center gap-4 text-[10.5px] text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-ink-faint" /> Set by a recurring rule
        </span>
      </div>

      {bulkSelection && (
        <div className="mt-4 rounded-md border border-hairline bg-white p-3.5">
          <p className="mb-2 text-[12.5px] font-semibold">
            Set {bulkSelection.length} half-day{bulkSelection.length > 1 ? "s" : ""} to:
          </p>
          <div className="flex items-center justify-between">
            <OptGroup
              aria-label="Bulk tier"
              options={TIER_OPTIONS}
              value={null}
              onChange={(tier) => applyBulkTier(tier)}
            />
            <button
              type="button"
              onClick={() => setBulkSelection(null)}
              className="text-[12px] font-semibold text-ink-soft"
            >
              Cancel
            </button>
          </div>
          {pending && <p className="mt-2 text-[11px] italic text-ink-faint">Saving…</p>}
        </div>
      )}

      {selectedDate && !bulkSelection && (
        <div className="mt-4 rounded-md border border-hairline bg-white p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[12.5px] font-semibold">
              {parseIsoDateUtc(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              })}
            </p>
            <button type="button" onClick={() => setSelectedDate(null)} className="text-[12px] text-ink-soft">
              Close
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Morning</p>
              {selectedRuleAm && (
                <p className="mb-1.5 text-[11px] italic text-ink-faint">
                  Set by your recurring rule &quot;{selectedRuleAm.ruleLabel ?? "Untitled rule"}&quot;. Tap to
                  override just this day.
                </p>
              )}
              <OptGroup
                aria-label="Morning availability"
                options={TIER_OPTIONS}
                value={selectedDay?.am?.tier ?? null}
                onChange={(tier) => applyDayTier("AM", tier)}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Afternoon</p>
              {selectedRulePm && (
                <p className="mb-1.5 text-[11px] italic text-ink-faint">
                  Set by your recurring rule &quot;{selectedRulePm.ruleLabel ?? "Untitled rule"}&quot;. Tap to
                  override just this day.
                </p>
              )}
              <OptGroup
                aria-label="Afternoon availability"
                options={TIER_OPTIONS}
                value={selectedDay?.pm?.tier ?? null}
                onChange={(tier) => applyDayTier("PM", tier)}
              />
            </div>
          </div>
          {pending && <p className="mt-2 text-[11px] italic text-ink-faint">Saving…</p>}
        </div>
      )}

      <div className="mt-8 border-t border-hairline pt-6">
        <RecurringRulesSection rules={rules} windowStart={windowStart} windowEnd={windowEnd} />
      </div>
    </div>
  );
}
