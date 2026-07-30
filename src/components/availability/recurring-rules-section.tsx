"use client";

import { useState } from "react";

import { ListRow } from "@/components/ui/list-row";
import { Sheet } from "@/components/ui/sheet";
import { RecurringRuleForm } from "@/components/availability/recurring-rule-form";
import { DAY_NAMES, TIER_LABEL, type Tier } from "@/lib/availability-tiers";

export type RuleRow = {
  id: string;
  dayOfWeek: number;
  halfDay: "AM" | "PM" | null;
  tier: string;
  label: string | null;
  effectiveStart: string;
  effectiveEnd: string | null;
};

function summarize(rule: RuleRow) {
  const dayName = DAY_NAMES[rule.dayOfWeek];
  const halfDayLabel = rule.halfDay === "AM" ? "morning" : rule.halfDay === "PM" ? "afternoon" : "all day";
  return `Every ${dayName}, ${halfDayLabel} · ${TIER_LABEL[rule.tier as Tier]}`;
}

/**
 * Recurring rules list + composer, per spec §4.3. Opens the shared Sheet
 * (bottom sheet on mobile, centered modal on desktop) for both creating a
 * new rule and editing an existing one.
 */
export function RecurringRulesSection({
  rules,
  windowStart,
  windowEnd,
}: {
  rules: RuleRow[];
  windowStart: string;
  windowEnd: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleRow | null>(null);

  function openCreate() {
    setEditingRule(null);
    setSheetOpen(true);
  }

  function openEdit(rule: RuleRow) {
    setEditingRule(rule);
    setSheetOpen(true);
  }

  return (
    <div>
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Recurring rules</p>

      {rules.length === 0 && (
        <p className="mb-3 text-[12.5px] text-ink-soft">
          No recurring rules yet. Add one for a schedule that repeats every week, like a standing rehearsal.
        </p>
      )}

      {rules.map((rule) => (
        <ListRow key={rule.id}>
          <button type="button" onClick={() => openEdit(rule)} className="flex-1 text-left">
            <p className="font-medium">{summarize(rule)}</p>
            {rule.label && <p className="text-[11px] text-ink-soft">{rule.label}</p>}
          </button>
        </ListRow>
      ))}

      <button type="button" onClick={openCreate} className="mt-3 text-xs font-semibold text-burgundy">
        + Add a rule
      </button>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingRule ? "Edit rule" : "New recurring rule"}
      >
        <RecurringRuleForm
          key={editingRule?.id ?? "new"}
          rule={editingRule}
          windowStart={windowStart}
          windowEnd={windowEnd}
          onDone={() => setSheetOpen(false)}
        />
      </Sheet>
    </div>
  );
}
