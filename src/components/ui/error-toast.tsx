"use client";

import { useEffect } from "react";

import { Toast } from "@/components/ui/toast";

/** Bottom-anchored error feedback for a failed optimistic update (design system §5.8). Auto-dismisses. */
export function ErrorToast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
      <Toast message={message} />
    </div>
  );
}
