"use client";

import { useState } from "react";

import { Toggle } from "@/components/ui/toggle";

type PrivacyToggleFieldProps = {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
  disabled?: boolean;
};

/**
 * Toggle switch is reserved for true booleans only (design system §5.2).
 * Each toggle carries a one-line description under the label — these are
 * exactly the kind of setting an organiser sets once and forgets, so the
 * description matters more here than almost anywhere else.
 */
export function PrivacyToggleField({ name, label, description, defaultChecked, disabled }: PrivacyToggleFieldProps) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center justify-between gap-3.5 border-b border-hairline py-3 last:border-b-0">
      <div>
        <p className="text-[13px] font-semibold">{label}</p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">{description}</p>
      </div>
      <Toggle
        aria-label={label}
        checked={checked}
        onChange={disabled ? () => {} : setChecked}
      />
      {checked && <input type="hidden" name={name} value="on" />}
    </div>
  );
}
