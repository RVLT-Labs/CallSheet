"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type SubmitButtonProps = {
  children: string;
  pendingLabel: string;
  className?: string;
};

/** Primary button that shows a pending label while its parent form action is in flight. */
export function SubmitButton({ children, pendingLabel, className }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
