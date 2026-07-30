"use client";

import { useState } from "react";

import { assignCrewToSlot } from "@/app/shoots/actions";

type ShootSlotSwapProps = {
  slotId: string;
  label: string;
  crew: { membershipId: string; name: string }[];
};

/** Reassigns a placeholder slot to a real crew member in place (issue #8 acceptance criteria). */
export function ShootSlotSwap({ slotId, label, crew }: ShootSlotSwapProps) {
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState(false);

  async function handleAssign() {
    if (!selected) return;
    setPending(true);
    await assignCrewToSlot(slotId, selected);
    setPending(false);
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
      <button type="button" onClick={handleAssign} disabled={!selected || pending} className="font-semibold text-burgundy">
        {pending ? "Assigning…" : "Assign"}
      </button>
    </div>
  );
}
