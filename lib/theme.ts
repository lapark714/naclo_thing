"use client";

/**
 * Theme. Like progress, it lives in localStorage and nowhere else — no
 * account, nothing to sync, nothing collected.
 *
 * Almost none of the theme is implemented here. CSS owns it: `color-scheme`
 * on the root drives every `light-dark()` token in globals.css, and left at
 * its default the page already follows the student's machine with no
 * JavaScript at all. All this module does is record the one case CSS cannot
 * see, which is a student who wants something other than what their machine
 * says, and write it to the attribute the stylesheet is watching.
 */

import { useSyncExternalStore } from "react";

const KEY = "morpheme.theme.v1";
const EVENT = "morpheme:theme";

export type Theme = "light" | "dark";

/** The inline script in app/layout.tsx runs this same logic before first paint. */
export function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function stored(): Theme | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw === "light" || raw === "dark" ? raw : null;
  } catch {
    // Private browsing lands here. Falling back to the machine's setting is a
    // better failure than refusing to render a page.
    return null;
  }
}

export function setTheme(next: Theme) {
  // The attribute first, so the repaint happens on this frame rather than
  // after React has been told about it.
  document.documentElement.dataset.theme = next;
  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    // A theme that does not survive a reload still beats a dead button.
  }
  window.dispatchEvent(new Event(EVENT));
}

/* ---------------------------------------------------------------------------
   Subscription. The attribute on <html> is the single source of truth, the
   same one the stylesheet reads, so there is never a second copy of the theme
   to fall out of step with the pixels.
   --------------------------------------------------------------------------- */

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  // A student who has never touched the toggle is still following their
  // machine, so a machine that flips at sunset should take the page with it
  // while the tab is open.
  const onSystemChange = () => {
    if (stored() === null) {
      document.documentElement.dataset.theme = systemTheme();
      onChange();
    }
  };

  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  media.addEventListener("change", onSystemChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
    media.removeEventListener("change", onSystemChange);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

// Statically generated HTML cannot know which theme a given reader will see,
// and guessing produces a hydration mismatch. Returning null instead lets the
// first client render match the server exactly; React then re-renders with the
// real value on the next tick. The visible state of the control does not wait
// for that — CSS has already picked the right label. This only governs what
// gets announced to a screen reader.
const getServerSnapshot = (): Theme | null => null;

export function useTheme(): Theme | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
