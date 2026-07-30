"use client";

import { useEffect, useState } from "react";

export type TourStep = {
  /** Matches a `data-tour="..."` attribute somewhere on the page. */
  target: string;
  title: string;
  body: string;
};

type Rect = { top: number; left: number; width: number; height: number };

const MARGIN = 12;
const CARD_WIDTH = 280;

function findVisibleTarget(target: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`);
  for (const el of candidates) {
    if (el.offsetWidth > 0 && el.offsetHeight > 0) return el;
  }
  return null;
}

/**
 * Coach-mark style walkthrough (design system voice: quiet, specific, no
 * generic "unlock"/"seamless" phrasing) — a dimmed backdrop with a spotlight
 * cut around the real on-page element, plus a small card pointing at it.
 * Steps that can't find their target (e.g. hidden at this breakpoint) are
 * skipped rather than shown floating in space.
 */
export function ProductTour({ steps, onFinish }: { steps: TourStep[]; onFinish: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [placement, setPlacement] = useState<"below" | "above">("below");

  const step = steps[stepIndex];

  useEffect(() => {
    if (!step) return;

    function measure() {
      const el = findVisibleTarget(step.target);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      setPlacement(r.top > window.innerHeight * 0.55 ? "above" : "below");
    }

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step]);

  // Target isn't on the page at this breakpoint/state — move on rather than
  // stall the tour or show a card pointing at nothing.
  useEffect(() => {
    if (step && rect === null) {
      const timeout = setTimeout(() => {
        if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
        else onFinish();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [step, rect, stepIndex, steps.length, onFinish]);

  if (!step || !rect) return null;

  const isLast = stepIndex === steps.length - 1;
  const cardLeft = Math.min(Math.max(rect.left, MARGIN), window.innerWidth - CARD_WIDTH - MARGIN);
  const cardTop =
    placement === "below" ? rect.top + rect.height + MARGIN : rect.top - MARGIN;

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className="pointer-events-none absolute rounded-[10px] transition-all duration-200"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          boxShadow: "0 0 0 3px rgba(110,31,42,0.45), 0 0 0 9999px rgba(58,46,40,0.5)",
        }}
      />

      <div
        className="absolute w-[280px] rounded-md border border-hairline bg-cream p-4 shadow-[0_10px_30px_rgba(58,46,40,0.2)] transition-all duration-200"
        style={{
          left: cardLeft,
          top: placement === "below" ? cardTop : undefined,
          bottom: placement === "above" ? window.innerHeight - cardTop : undefined,
        }}
      >
        <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-burgundy">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <p className="font-display mb-1.5 text-base font-bold italic text-burgundy">{step.title}</p>
        <p className="mb-4 text-[12.5px] leading-relaxed text-ink-soft">{step.body}</p>
        <div className="flex items-center justify-between">
          <button type="button" onClick={onFinish} className="text-[12px] font-semibold text-ink-soft">
            Skip tour
          </button>
          <button
            type="button"
            onClick={() => (isLast ? onFinish() : setStepIndex((i) => i + 1))}
            className="rounded-md bg-burgundy px-4 py-2 text-[12.5px] font-bold text-white"
          >
            {isLast ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
