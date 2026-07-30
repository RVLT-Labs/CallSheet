import type { TextareaHTMLAttributes } from "react";

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
};

/** Multi-line counterpart to TextField, same underline-style treatment (design system field pattern). */
export function TextAreaField({ label, hint, id, rows = 3, ...props }: TextAreaFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="mb-[18px]">
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-ink-soft"
      >
        {label}
      </label>
      <textarea
        id={inputId}
        rows={rows}
        className="w-full resize-none border-0 border-b-[1.5px] border-hairline bg-transparent py-2 text-[14.5px] text-ink placeholder:text-ink-faint focus:border-burgundy focus:outline-none"
        {...props}
      />
      {hint && <p className="mt-1.5 text-[11px] italic text-ink-faint">{hint}</p>}
    </div>
  );
}
