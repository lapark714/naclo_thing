"use client";

import { useEffect, useRef } from "react";
import { scroll } from "motion";

/**
 * A hairline at the top of the page that fills as you read down a problem.
 *
 * Motion here answers to a job, the same way colour does in this design
 * system. A NACLO problem runs long, and its data tables push the questions
 * far below the fold, so "how much of this is left" is a real question a
 * student asks. Nothing else on the page answers it.
 *
 * Ink rather than the action colour: the accent means action and brand, and a
 * position indicator is neither. Keeping it achromatic also keeps it quiet,
 * which is the point.
 *
 * Driven by scroll position rather than by a transition, so it never animates
 * on its own. It only ever reflects where the page already is.
 */
export function ReadingProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bar.current;
    if (!el) return;

    // Someone who has asked the OS to reduce motion is not asking for a
    // subtler animation, they are asking for none. The bar stays hidden
    // rather than snapping between positions.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.style.opacity = "1";
    return scroll((progress: number) => {
      el.style.transform = `scaleX(${progress})`;
    });
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px]"
    >
      <div
        ref={bar}
        className="h-full origin-left bg-ink opacity-0"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
