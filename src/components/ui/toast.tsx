type ToastProps = {
  message: string;
  undoLabel?: string;
  onUndo?: () => void;
};

/**
 * Dark toast, bottom-anchored above the tab bar (design system §5.8).
 * Purely presentational — triggering/auto-dismiss/queueing is feature logic
 * that belongs to whichever screen first needs it, not the design system.
 */
export function Toast({ message, undoLabel, onUndo }: ToastProps) {
  return (
    <div className="flex w-full max-w-sm items-center justify-between rounded-md bg-ink px-4 py-[11px] text-[12.5px] font-semibold text-white">
      <span>{message}</span>
      {undoLabel && onUndo && (
        <button type="button" onClick={onUndo} className="font-bold text-taupe">
          {undoLabel}
        </button>
      )}
    </div>
  );
}
