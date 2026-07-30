"use client";

/**
 * Timers store a start timestamp and a duration, never an elapsed-second
 * counter. Counters drift when the tab is backgrounded and reset on reload,
 * which would let an attempt be restarted by accident or on purpose.
 *
 * A render tick recomputes remaining time from the timestamp, for display only.
 */

const KEY = (problemId: string) => `gloss.timer.${problemId}`;

export type TimerState = {
  startedAt: number;
  durationMs: number;
};

export function startTimer(problemId: string, minutes: number): TimerState {
  const state: TimerState = { startedAt: Date.now(), durationMs: minutes * 60_000 };
  try {
    window.localStorage.setItem(KEY(problemId), JSON.stringify(state));
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
