import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

/**
 * Underline-style text input used throughout auth/profile forms (design
 * system field pattern — small uppercase label, hairline underline that
 * turns burgundy on focus, no boxed border).
 */
export function TextField({ label, hint, id, ...props }: TextFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="mb-[18px]">
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-ink-soft"
      >
        {label}
      </label>
      <input
        id={inputId}
        className="w-full border-0 border-b-[1.5px] border-hairline bg-transparent py-2 text-[14.5px] text-ink placeholder:text-ink-faint focus:border-burgundy focus:outline-none"
        {...props}
      />
      {hint && <p className="mt-1.5 text-[11px] italic text-ink-faint">{hint}</p>}
    </div>
  );
}
