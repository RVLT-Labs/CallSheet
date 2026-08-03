"use client";

import { useMemo, useState, useTransition } from "react";

import { ErrorToast } from "@/components/ui/error-toast";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { OptGroup } from "@/components/ui/opt-group";
import { TextField } from "@/components/ui/text-field";
import { ChevronRightIcon } from "@/components/ui/icons";
import { CalendarCell, DayCell } from "@/components/availability/day-cell";
import { RecurringRulesSection, type RuleRow } from "@/components/availability/recurring-rules-section";
import { BLOCK_TYPE_LABEL, BLOCK_TYPE_OPTIONS, type BlockType } from "@/lib/availability-blocks";
import { formatTimeRange } from "@/lib/time";
import { addBlock, clearDay, editBlock, removeBlock } from "@/app/availability/actions";
import type { DayCell as DayCellData, DayCellBlock } from "@/server/availability";
import { parseIsoDateUtc, toIsoDate, utcDate } from "@/server/availability-rules";

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

function dayLabel(dateIso: string) {
  return parseIsoDateUtc(dateIso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

type BlockDraft = { startTime: string; endTime: string; blockType: BlockType; label: string };

const EMPTY_DRAFT: BlockDraft = { startTime: "09:00", endTime: "17:00", blockType: "hard", label: "" };

/** The selected day's blocks, plus an add/edit form for manual blocks. Recurring-derived blocks show which rule set them and can only be cleared for the whole day, not edited in place. */
function DayDetailPanel({
  dateIso,
  blocks,
  pending,
  onAdd,
  onEdit,
  onDelete,
  onClearDay,
  onClose,
}: {
  dateIso: string;
  blocks: DayCellBlock[];
  pending: boolean;
  onAdd: (draft: BlockDraft) => void;
  onEdit: (blockId: string, draft: BlockDraft) => void;
  onDelete: (blockId: string) => void;
  onClearDay: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<BlockDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);

  const hasRecurring = blocks.some((b) => b.source === "recurring");

  function startEdit(block: DayCellBlock) {
    if (!block.id) return;
    setEditingId(block.id);
    setDraft({ startTime: block.startTime, endTime: block.endTime, blockType: block.blockType, label: block.label ?? "" });
  }

  function submit() {
    if (editingId) onEdit(editingId, draft);
    else onAdd(draft);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  return (
    <div className="mt-4 rounded-md border border-hairline bg-white p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12.5px] font-semibold">{dayLabel(dateIso)}</p>
        <button type="button" onClick={onClose} className="text-[12px] text-ink-soft">
          Close
        </button>
      </div>

      {blocks.length === 0 && (
        <p className="mb-3 text-[12.5px] text-ink-soft">
          Free all day. Add a block below for anything you&apos;re not free for.
        </p>
      )}

      {blocks.map((block, i) => (
        <ListRow key={block.id ?? `recurring-${i}`}>
          <div>
            <p className="text-[12.5px] font-medium">
              {formatTimeRange(block.startTime, block.endTime)} · {BLOCK_TYPE_LABEL[block.blockType]}
            </p>
            {block.label && <p className="text-[11px] text-ink-soft">{block.label}</p>}
            {block.source === "recurring" && (
              <p className="text-[11px] italic text-ink-faint">
                Set by your recurring rule &quot;{block.ruleLabel ?? "Untitled rule"}&quot;
              </p>
            )}
          </div>
          {block.id && (
            <div className="flex shrink-0 gap-3 text-[11.5px] font-semibold">
              <button type="button" onClick={() => startEdit(block)} className="text-burgundy">
                Edit
              </button>
              <button type="button" onClick={() => onDelete(block.id!)} className="text-ink-soft">
                Delete
              </button>
            </div>
          )}
        </ListRow>
      ))}

      {hasRecurring && (
        <button type="button" onClick={onClearDay} className="mt-2 text-[12px] font-semibold text-burgundy">
          Override — mark this day fully free
        </button>
      )}

      <div className="mt-4 border-t border-hairline pt-3.5">
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
          {editingId ? "Edit block" : "Add a block"}
        </p>
        <div className="grid grid-cols-2 gap-3.5">
          <TextField
            label="Start time"
            type="time"
            value={draft.startTime}
            onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
          />
          <TextField
            label="End time"
            type="time"
            value={draft.endTime}
            onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
          />
        </div>
        <div className="mb-[18px]">
          <p className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Type</p>
          <OptGroup
            aria-label="Blocker type"
            options={BLOCK_TYPE_OPTIONS}
            value={draft.blockType}
            onChange={(blockType) => setDraft((d) => ({ ...d, blockType }))}
          />
        </div>
        <TextField
          label="Label (optional)"
          placeholder="e.g. Waitressing shift"
          value={draft.label}
          onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
        />
        <div className="flex items-center gap-3">
          <Button type="button" onClick={submit} disabled={pending} className="flex-1">
            {pending ? "Saving…" : editingId ? "Save changes" : "Add block"}
          </Button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setDraft(EMPTY_DRAFT);
              }}
              className="text-[12.5px] font-semibold text-ink-soft"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AvailabilityCalendar({ windowStart, windowEnd, days, rules }: AvailabilityCalendarProps) {
  const startDate = parseIsoDateUtc(windowStart);
  const endDate = parseIsoDateUtc(windowEnd);

  const [viewYear, setViewYear] = useState(startDate.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(startDate.getUTCMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [todayIso] = useState(() => toIsoDate(new Date()));

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

  function runAction(fn: () => Promise<void>) {
    startTransition(async () => {
      try {
        await fn();
      } catch {
        setError("Couldn't save your availability. Try again.");
      }
    });
  }

  const selectedBlocks = selectedDate ? (daysByIso.get(selectedDate)?.blocks ?? []) : [];

  return (
    <div>
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
          Nothing set yet — you&apos;re shown as free every day until you add a block for something you&apos;re not
          free for.
        </p>
      )}

      <div className="overflow-hidden rounded-lg border-l border-t border-hairline">
        <div className="grid grid-cols-7 bg-cream-deep">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span
              key={i}
              className="border-b border-r border-hairline py-1.5 text-center text-[10px] font-bold uppercase text-ink-faint"
            >
              {d}
            </span>
          ))}
        </div>

        {weeks.map((week, i) => (
          <div key={i} className="grid grid-cols-7">
            {week.map((cell, j) => (
              <DayCell
                key={cell?.dateIso ?? `blank-${i}-${j}`}
                cell={cell}
                blocks={cell ? (daysByIso.get(cell.dateIso)?.blocks ?? []) : []}
                isSelected={cell?.dateIso === selectedDate}
                isToday={cell?.dateIso === todayIso}
                onSelect={setSelectedDate}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[10.5px] text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-burgundy" /> Hard blocker
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-terracotta" /> Soft blocker
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-ink-faint" /> Set by a recurring rule
        </span>
      </div>

      {selectedDate && (
        <DayDetailPanel
          key={selectedDate}
          dateIso={selectedDate}
          blocks={selectedBlocks}
          pending={pending}
          onAdd={(draft) =>
            runAction(() => addBlock(selectedDate, { ...draft, label: draft.label.trim() || null }))
          }
          onEdit={(blockId, draft) =>
            runAction(() => editBlock(blockId, { ...draft, label: draft.label.trim() || null }))
          }
          onDelete={(blockId) => runAction(() => removeBlock(blockId))}
          onClearDay={() => runAction(() => clearDay(selectedDate))}
          onClose={() => setSelectedDate(null)}
        />
      )}

      <div className="mt-8 border-t border-hairline pt-6">
        <RecurringRulesSection rules={rules} windowStart={windowStart} windowEnd={windowEnd} />
      </div>

      <ErrorToast message={error} onDismiss={() => setError(null)} />
    </div>
  );
}
