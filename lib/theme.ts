"use client";

/**
 * Theme. Like progress, it lives in localStorage and nowhere else — no
 * account, nothing to sync, nothing collected.
 *
 * Almost none of the theme is implemented here. CSS owns it: `color-scheme`
 * on the root drives every `light-dark()` token in globals.css, and left
 * alone it is `light`, so the site opens light for everyone with no
 * JavaScript at all. All this module does is record the one case CSS cannot
 * see, which is a student who wants night, and write it to the attribute the
 * stylesheet is watching.
 */

import { useSyncExternalStore } from "react";

const KEY = "morpheme.theme.v1";
const EVENT = "morpheme:theme";

export type Theme = "light" | "dark";

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
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// No attribute means nobody has chosen, and nobody choosing means light.
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
