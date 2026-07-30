import { cn } from "@/lib/cn";

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  "aria-label": string;
};

/**
 * Reserved for true booleans only (design system §5.2) — this is the ONLY
 * place a toggle appears. Everywhere else, use OptGroup or PillRow instead,
 * even for a boolean-feeling choice, so it has named states.
 */
export function Toggle({ checked, onChange, ...props }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={props["aria-label"]}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-block h-[23px] w-10 rounded-full border transition-colors",
        checked ? "border-burgundy bg-burgundy" : "border-hairline bg-taupe",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] h-[17px] w-[17px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all",
          checked ? "left-[19px]" : "left-[2px]",
        )}
      />
    </button>
  );
}
