"use client";

import { useMemo, useState } from "react";

import { OptGroup } from "@/components/ui/opt-group";
import { PillRow } from "@/components/ui/pill-row";
import { ChevronRightIcon } from "@/components/ui/icons";
import { CalendarCell, DayCell, type HalfDayState } from "@/components/availability/day-cell";
import { RecurringRulesSection, type RuleRow } from "@/components/availability/recurring-rules-section";
import { TIER_OPTIONS, type Tier } from "@/lib/availability-tiers";
import { setBulkTier, setDayTier } from "@/app/availability/actions";
import { parseIsoDateUtc, toIsoDate, utcDate, type HalfDay } from "@/server/availability-rules";

type DayCellData = { dateIso: string; am: HalfDayState; pm: HalfDayState };

type AvailabilityCalendarProps = {
  windowStart: string;
  windowEnd: string;
  days: DayCellData[];
  rules: RuleRow[];
};

/** What half(s) of the day a tier choice applies to — "BOTH" is the whole-day shortcut. */
type TargetHalf = HalfDay | "BOTH";

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

function dayLabel(dateIso: string) {
  return parseIsoDateUtc(dateIso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Single selected day: whole-day tier by default, or split into AM/PM. Reset on each new day via `key`. */
function DayDetailPanel({
  dateIso,
  am,
  pm,
  pending,
  onApply,
  onClose,
}: {
  dateIso: string;
  am: HalfDayState;
  pm: HalfDayState;
  pending: boolean;
  onApply: (target: TargetHalf, tier: Tier) => void;
  onClose: () => void;
}) {
  const [splitMode, setSplitMode] = useState(Boolean(am || pm) && am?.tier !== pm?.tier);
  const amRule = am?.source === "recurring" ? am : null;
  const pmRule = pm?.source === "recurring" ? pm : null;

  return (
    <div className="mt-4 rounded-md border border-hairline bg-white p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12.5px] font-semibold">{dayLabel(dateIso)}</p>
        <button type="button" onClick={onClose} className="text-[12px] text-ink-soft">
          Close
        </button>
      </div>

      {!splitMode ? (
        <div>
          <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Whole day</p>
          <OptGroup
            aria-label="Whole day availability"
            options={TIER_OPTIONS}
            value={am?.tier === pm?.tier ? (am?.tier ?? null) : null}
            onChange={(tier) => onApply("BOTH", tier)}
          />
          <button
            type="button"
            onClick={() => setSplitMode(true)}
            className="mt-3 text-[12px] font-semibold text-burgundy"
          >
            Set morning &amp; afternoon separately
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Morning</p>
            {amRule && (
              <p className="mb-1.5 text-[11px] italic text-ink-faint">
                Set by your recurring rule &quot;{amRule.ruleLabel ?? "Untitled rule"}&quot;. Tap to override just
                this day.
              </p>
            )}
            <OptGroup
              aria-label="Morning availability"
              options={TIER_OPTIONS}
              value={am?.tier ?? null}
              onChange={(tier) => onApply("AM", tier)}
            />
          </div>
          <div>
            <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Afternoon</p>
            {pmRule && (
              <p className="mb-1.5 text-[11px] italic text-ink-faint">
                Set by your recurring rule &quot;{pmRule.ruleLabel ?? "Untitled rule"}&quot;. Tap to override just
                this day.
              </p>
            )}
            <OptGroup
              aria-label="Afternoon availability"
              options={TIER_OPTIONS}
              value={pm?.tier ?? null}
              onChange={(tier) => onApply("PM", tier)}
            />
          </div>
          <button type="button" onClick={() => setSplitMode(false)} className="text-[12px] font-semibold text-ink-soft">
            Use one setting for the whole day
          </button>
        </div>
      )}
      {pending && <p className="mt-2 text-[11px] italic text-ink-faint">Saving…</p>}
    </div>
  );
}

/** Multiple selected days from a drag: whole-day tier for all of them, or morning-only/afternoon-only for all of them. */
function BulkDetailPanel({
  dates,
  pending,
  onApply,
  onCancel,
}: {
  dates: string[];
  pending: boolean;
  onApply: (target: TargetHalf, tier: Tier) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"whole" | "half">("whole");
  const [halfDay, setHalfDay] = useState<HalfDay>("AM");
  const sorted = useMemo(() => [...dates].sort(), [dates]);

  return (
    <div className="mt-4 rounded-md border border-hairline bg-white p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12.5px] font-semibold">
          {sorted.length} day{sorted.length > 1 ? "s" : ""} selected
        </p>
        <button type="button" onClick={onCancel} className="text-[12px] font-semibold text-ink-soft">
          Cancel
        </button>
      </div>

      <PillRow
        aria-label="Bulk mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: "whole", label: "Whole day" },
          { value: "half", label: "Morning or afternoon" },
        ]}
      />

      {mode === "half" && (
        <div className="mt-3">
          <PillRow
            aria-label="Half day"
            value={halfDay}
            onChange={setHalfDay}
            options={[
              { value: "AM", label: "Morning" },
              { value: "PM", label: "Afternoon" },
            ]}
          />
        </div>
      )}

      <p className="mb-1.5 mt-3 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Set to</p>
      <OptGroup
        aria-label="Bulk tier"
        options={TIER_OPTIONS}
        value={null}
        onChange={(tier) => onApply(mode === "whole" ? "BOTH" : halfDay, tier)}
      />
      {pending && <p className="mt-2 text-[11px] italic text-ink-faint">Saving…</p>}
    </div>
  );
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
  const [bulkSelection, setBulkSelection] = useState<string[] | null>(null);
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

  function onDayDown(dateIso: string) {
    setDragging(true);
    setDragStartedFresh(true);
    setTouched(new Set([dateIso]));
    setBulkSelection(null);
  }

  function onDayEnter(dateIso: string) {
    if (!dragging) return;
    setDragStartedFresh(false);
    setTouched((prev) => new Set(prev).add(dateIso));
  }

  function endDrag() {
    if (!dragging) return;
    setDragging(false);

    if (touched.size === 1) {
      const [dateIso] = touched;
      setSelectedDate(dateIso);
      setBulkSelection(null);
    } else if (touched.size > 1) {
      setBulkSelection([...touched]);
      setSelectedDate(null);
    }
    setTouched(new Set());
  }

  function markWeek(week: CalendarCell[]) {
    const dateIsos = week.filter((c): c is Exclude<CalendarCell, null> => !!c && c.inWindow).map((c) => c.dateIso);
    if (dateIsos.length === 0) return;
    setBulkSelection(dateIsos);
    setSelectedDate(null);
  }

  async function applyBulkTier(target: TargetHalf, tier: Tier) {
    if (!bulkSelection) return;
    setPending(true);
    const cells = bulkSelection.flatMap((dateIso) =>
      target === "BOTH"
        ? [
            { dateIso, halfDay: "AM" as const },
            { dateIso, halfDay: "PM" as const },
          ]
        : [{ dateIso, halfDay: target }],
    );
    await setBulkTier(cells, tier);
    setPending(false);
    setBulkSelection(null);
  }

  async function applyDayTier(target: TargetHalf, tier: Tier) {
    if (!selectedDate) return;
    setPending(true);
    if (target === "BOTH") {
      await setBulkTier(
        [
          { dateIso: selectedDate, halfDay: "AM" },
          { dateIso: selectedDate, halfDay: "PM" },
        ],
        tier,
      );
    } else {
      await setDayTier(selectedDate, target, tier);
    }
    setPending(false);
  }

  const selectedDay = selectedDate ? daysByIso.get(selectedDate) : undefined;

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
          Nothing set yet. Tap a day below to mark yourself Best, OK, or Unavailable, or drag across a few days to
          set them all at once.
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
                am={cell ? (daysByIso.get(cell.dateIso)?.am ?? null) : null}
                pm={cell ? (daysByIso.get(cell.dateIso)?.pm ?? null) : null}
                isSelected={cell?.dateIso === selectedDate}
                isTouched={!!cell && touched.has(cell.dateIso)}
                onPointerDown={onDayDown}
                onPointerEnter={onDayEnter}
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
        <BulkDetailPanel
          key={[...bulkSelection].sort().join(",")}
          dates={bulkSelection}
          pending={pending}
          onApply={applyBulkTier}
          onCancel={() => setBulkSelection(null)}
        />
      )}

      {selectedDate && !bulkSelection && (
        <DayDetailPanel
          key={selectedDate}
          dateIso={selectedDate}
          am={selectedDay?.am ?? null}
          pm={selectedDay?.pm ?? null}
          pending={pending}
          onApply={applyDayTier}
          onClose={() => setSelectedDate(null)}
        />
      )}

      <div className="mt-8 border-t border-hairline pt-6">
        <RecurringRulesSection rules={rules} windowStart={windowStart} windowEnd={windowEnd} />
      </div>
    </div>
  );
}
