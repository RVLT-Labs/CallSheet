"use client";

import { useOptimistic, useState, useTransition } from "react";

import { assignCrewToSlot } from "@/app/meetings/actions";
import { ErrorToast } from "@/components/ui/error-toast";

type MeetingSlotSwapProps = {
  slotId: string;
  label: string;
  crew: { membershipId: string; name: string }[];
};

/** Reassigns a placeholder slot to a real crew member in place. */
export function MeetingSlotSwap({ slotId, label, crew }: MeetingSlotSwapProps) {
  const [selected, setSelected] = useState("");
  const [optimisticAssignee, setOptimisticAssignee] = useOptimistic<string | null, string>(
    null,
    (_state, name) => name,
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAssign() {
    if (!selected) return;
    const membershipId = selected;
    const name = crew.find((c) => c.membershipId === membershipId)?.name ?? "";
    startTransition(async () => {
      setOptimisticAssignee(name);
      try {
        await assignCrewToSlot(slotId, membershipId);
      } catch {
        setError("Couldn't assign that slot. Try again.");
      }
    });
  }

  if (optimisticAssignee) {
    return (
      <div className="flex items-center gap-2.5 py-1.5 text-[12px] text-ink-soft">
        <span>
          {label} → {optimisticAssignee}
        </span>
        <ErrorToast message={error} onDismiss={() => setError(null)} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 py-1.5 text-[12px]">
      <span className="text-ink-soft">{label} (placeholder)</span>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded border border-hairline bg-white px-2 py-1 text-[12px]"
      >
        <option value="">Assign crew…</option>
        {crew.map((c) => (
          <option key={c.membershipId} value={c.membershipId}>
            {c.name}
          </option>
        ))}
      </select>
      <button type="button" onClick={handleAssign} disabled={!selected || isPending} className="font-semibold text-burgundy">
        {isPending ? "Assigning…" : "Assign"}
      </button>
      <ErrorToast message={error} onDismiss={() => setError(null)} />
    </div>
  );
}
