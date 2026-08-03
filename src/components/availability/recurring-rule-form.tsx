"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DayChips } from "@/components/ui/day-chips";
import { OptGroup } from "@/components/ui/opt-group";
import { PillRow } from "@/components/ui/pill-row";
import { TextField } from "@/components/ui/text-field";
import { createRecurringRule, deleteRecurringRule, updateRecurringRule } from "@/app/availability/actions";
import { BLOCK_TYPE_LABEL, BLOCK_TYPE_OPTIONS, DAY_NAMES, type BlockType } from "@/lib/availability-blocks";
import { formatTimeRange } from "@/lib/time";
import type { RuleRow } from "@/components/availability/recurring-rules-section";

export function RecurringRuleForm({
  rule,
  windowStart,
  windowEnd,
  onDone,
}: {
  rule: RuleRow | null;
  windowStart: string;
  windowEnd: string;
  onDone: () => void;
}) {
  const isEdit = !!rule;

  const [days, setDays] = useState<boolean[]>(() => {
    const initial = new Array(7).fill(false);
    if (rule) initial[rule.dayOfWeek] = true;
    return initial;
  });
  const [startTime, setStartTime] = useState(rule?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(rule?.endTime ?? "17:00");
  const [blockType, setBlockType] = useState<BlockType>((rule?.blockType as BlockType) ?? "hard");
  const [label, setLabel] = useState(rule?.label ?? "");
  const [effectiveStart, setEffectiveStart] = useState(rule?.effectiveStart ?? windowStart);
  const [endsMode, setEndsMode] = useState<"never" | "onDate">(rule?.effectiveEnd ? "onDate" : "never");
  const [effectiveEnd, setEffectiveEnd] = useState(rule?.effectiveEnd ?? windowEnd);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(dayIndex: number) {
    if (isEdit) {
      setDays(new Array(7).fill(false).map((_, i) => i === dayIndex));
      return;
    }
    setDays((prev) => prev.map((v, i) => (i === dayIndex ? !v : v)));
  }

  const selectedDayNames = days.map((v, i) => (v ? DAY_NAMES[i] : null)).filter(Boolean) as string[];
  const summary = `Repeats every week on ${selectedDayNames.join(", ") || "no days yet"}, ${formatTimeRange(startTime, endTime)} · ${BLOCK_TYPE_LABEL[blockType]}. Ends ${
    endsMode === "never" ? "never" : `on ${effectiveEnd}`
  }.`;

  async function handleSave() {
    if (selectedDayNames.length === 0) {
      setError("Pick at least one day");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const effectiveEndValue = endsMode === "onDate" ? effectiveEnd : "";

      if (isEdit && rule) {
        const dayOfWeek = days.findIndex(Boolean);
        await updateRecurringRule(rule.id, {
          dayOfWeek,
          startTime,
          endTime,
          blockType,
          label,
          effectiveStart,
          effectiveEnd: effectiveEndValue,
        });
      } else {
        const daysOfWeek = days.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
        await createRecurringRule({
          daysOfWeek,
          startTime,
          endTime,
          blockType,
          label,
          effectiveStart,
          effectiveEnd: effectiveEndValue,
        });
      }
      onDone();
    } catch {
      setError("Could not save this rule. Try again.");
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!rule) return;
    setPending(true);
    await deleteRecurringRule(rule.id);
    onDone();
  }

  return (
    <div>
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Days</p>
      <DayChips selected={days} onToggle={toggleDay} />

      <p className="mb-2 mt-5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Time</p>
      <div className="grid grid-cols-2 gap-3.5">
        <TextField label="Start time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        <TextField label="End time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
      </div>

      <p className="mb-2 mt-5 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Type</p>
      <OptGroup aria-label="Blocker type" options={BLOCK_TYPE_OPTIONS} value={blockType} onChange={setBlockType} />

      <div className="mt-5">
        <TextField
          label="Label (optional)"
          placeholder="e.g. Tuesday night class"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <TextField
          label="Starts"
          type="date"
          min={windowStart}
          max={windowEnd}
          value={effectiveStart}
          onChange={(e) => setEffectiveStart(e.target.value)}
        />
        <div>
          <p className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Ends</p>
          <PillRow
            aria-label="Ends"
            options={[
              { value: "never", label: "Never" },
              { value: "onDate", label: "On a date" },
            ]}
            value={endsMode}
            onChange={setEndsMode}
          />
        </div>
      </div>

      {endsMode === "onDate" && (
        <TextField
          label="End date"
          type="date"
          min={effectiveStart}
          max={windowEnd}
          value={effectiveEnd}
          onChange={(e) => setEffectiveEnd(e.target.value)}
        />
      )}

      <p className="mb-4 mt-2 text-[11px] italic text-ink-faint">{summary}</p>

      {error && <p className="mb-3 text-[11.5px] text-burgundy">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={pending} className="flex-1">
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add rule"}
        </Button>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="text-[12.5px] font-semibold text-burgundy"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
