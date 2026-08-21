"use client";

/**
 * Two cells, borrowed wholesale from the filter chips: square, hairline
 * border, uppercase label, and the active one taking the ink fill. The
 * product already has a word for "this control is on", so the theme switch
 * says it the same way rather than inventing a slider or reaching for a sun
 * and a moon, which would be the only icons on the entire site.
 *
 * Which cell is filled is decided in CSS, not here. See globals.css: this
 * page is statically generated and cannot know which theme a given reader
 * will get, so a React-driven fill would light the wrong cell until
 * hydration. The stylesheet already knows, on the first frame, and the only
 * thing left for JavaScript is what gets announced to a screen reader.
 */

import { setTheme, useTheme, type Theme } from "@/lib/theme";

const CHOICES: Theme[] = ["light", "dark"];

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useTheme();

  return (
    <div
      role="group"
      aria-label="Page theme"
      className={`inline-flex shrink-0 border border-rule-strong ${className}`}
    >
      {CHOICES.map((choice, i) => (
        <button
          key={choice}
          type="button"
          data-theme-pick={choice}
          onClick={() => setTheme(choice)}
          // Undefined until the store has read the document, because a guess
          // here is a hydration mismatch and the control is not operable
          // before hydration anyway.
          aria-pressed={theme === null ? undefined : theme === choice}
          className={`px-2.5 py-1 text-[0.72rem] font-semibold tracking-[0.14em] text-ink-soft uppercase transition-colors hover:text-ink ${
            i > 0 ? "border-l border-rule-strong" : ""
          }`}
        >
          {choice}
        </button>
      ))}
    </div>
  );
}
