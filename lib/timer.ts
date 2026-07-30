"use client";

/**
 * Timers store a start timestamp and a duration, never an elapsed-second
 * counter. Counters drift when the tab is backgrounded and reset on reload,
 * which would let an attempt be restarted by accident or on purpose.
 *
 * A render tick recomputes remaining time from the timestamp, for display only.
 */

import { useSyncExternalStore } from "react";

const KEY = (problemId: string) => `gloss.timer.${problemId}`;
const EVENT = "gloss:timer";

export type TimerState = {
  startedAt: number;
  durationMs: number;
};

export function startTimer(problemId: string, minutes: number): TimerState {
  const state: TimerState = { startedAt: Date.now(), durationMs: minutes * 60_000 };
  try {
    window.localStorage.setItem(KEY(problemId), JSON.stringify(state));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Non-persistent timer is still better than none.
  }
  return state;
}

export function readTimer(problemId: string): TimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY(problemId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TimerState;
    if (typeof parsed.startedAt !== "number" || typeof parsed.durationMs !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearTimer(problemId: string) {
  try {
    window.localStorage.removeItem(KEY(problemId));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* nothing to do */
  }
}

/** Milliseconds left, floored at zero. Derived, never stored. */
export function remainingMs(state: TimerState, now = Date.now()): number {
  return Math.max(0, state.startedAt + state.durationMs - now);
}

export function formatDuration(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/* ---------------------------------------------------------------------------
   Subscription, so a component never has to copy the stored timer into local
   state on mount.
   --------------------------------------------------------------------------- */

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const lastRaw = new Map<string, string | null>();
const lastParsed = new Map<string, TimerState | null>();

function snapshotFor(problemId: string): TimerState | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY(problemId));
  } catch {
    return null;
  }
  if (lastRaw.get(problemId) === raw) return lastParsed.get(problemId) ?? null;
  lastRaw.set(problemId, raw);
  const parsed = readTimer(problemId);
  lastParsed.set(problemId, parsed);
  return parsed;
}

export function useStoredTimer(problemId: string): TimerState | null {
  return useSyncExternalStore(
    subscribe,
    () => snapshotFor(problemId),
    () => null,
  );
}
