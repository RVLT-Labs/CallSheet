import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "link";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-burgundy text-white rounded-md px-5 py-[11px] text-[13.5px] font-bold",
  secondary:
    "border border-hairline text-ink-soft rounded-md px-5 py-[11px] text-[13.5px] font-bold",
  link: "text-burgundy font-semibold text-[13px]",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  href?: string;
  /** Anchor id for the dashboard product tour (product-tour.tsx). */
  "data-tour"?: string;
};

/**
 * The three button treatments in the design system (§5.1). Tentative/
 * confirmed and sent/draft actions must use two visually distinct variants
 * (e.g. secondary + primary), never the same button with a swapped label.
 */
export function Button({
  variant = "primary",
  className,
  href,
  "data-tour": dataTour,
  ...props
}: ButtonProps) {
  const classes = cn(variantClasses[variant], className);

  if (href) {
    return (
      <Link href={href} className={classes} data-tour={dataTour}>
        {props.children}
      </Link>
    );
  }

  return <button className={classes} data-tour={dataTour} {...props} />;
}
