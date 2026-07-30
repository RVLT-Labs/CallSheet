"use client";

import { useState } from "react";

import { RoleChip } from "@/components/ui/role-chip";
import { ROLE_PRESETS } from "@/lib/roles";

type RoleChipPickerProps = {
  name: string;
  defaultValue: string[];
};

/**
 * Multi-select role tags (design system §5.2, spec §4.2a) — people can hold
 * more than one role. Preset chips plus a "+ Add" affordance for anything
 * not in the preset list, since Membership.roleTags is free-form.
 */
export function RoleChipPicker({ name, defaultValue }: RoleChipPickerProps) {
  const initialCustom = defaultValue.filter(
    (r) => !(ROLE_PRESETS as readonly string[]).includes(r),
  );
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [customRoles, setCustomRoles] = useState<string[]>(initialCustom);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const allRoles = [...ROLE_PRESETS, ...customRoles.filter((r) => !ROLE_PRESETS.includes(r as never))];

  function toggle(role: string) {
    setSelected((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  function commitDraft() {
    const value = draft.trim();
    if (value && !allRoles.includes(value)) {
      setCustomRoles((prev) => [...prev, value]);
      setSelected((prev) => [...prev, value]);
    }
    setDraft("");
    setAdding(false);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {allRoles.map((role) => (
          <RoleChip key={role} label={role} selected={selected.includes(role)} onToggle={() => toggle(role)} />
        ))}
        {adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitDraft();
              }
            }}
            placeholder="Role name"
            className="w-28 rounded-full border border-hairline bg-white px-3.5 py-[7px] text-xs font-semibold text-ink placeholder:text-ink-faint focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full border border-hairline bg-white px-3.5 py-[7px] text-xs font-semibold text-ink-soft"
          >
            + Add
          </button>
        )}
      </div>
      {selected.map((role) => (
        <input key={role} type="hidden" name={name} value={role} />
      ))}
    </div>
  );
}
