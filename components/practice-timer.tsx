"use client";

import { useEffect, useState } from "react";
import {
  clearTimer,
  formatDuration,
  remainingMs,
  startTimer,
  useStoredTimer,
} from "@/lib/timer";
import { setDefaultTimerMinutes, useProgress } from "@/lib/progress";

/**
 * A pacing tool, not a punishment. At expiry a banner appears and the input
 * stays live — cutting someone off mid-thought interrupts them at the worst
 * possible moment.
 *
 * No suggested length. The booklet's own budget is a contest constraint, not
 * advice to someone practising at their own pace, and printing it turns a limit
 * the student chose into one they are measured against. The only number offered
 * is the one they saved themselves.
 */
export function PracticeTimer({ problemId }: { problemId: string }) {
  const saved = useStoredTimer(problemId);
  const { defaultTimerMinutes } = useProgress();
  const [draft, setDraft] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Display tick only. Remaining time is always recomputed from the stored
  // timestamp, so backgrounding the tab and reloading both behave.
  useEffect(() => {
    if (!saved) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [saved]);

  const minutes = draft ?? (defaultTimerMinutes ? String(defaultTimerMinutes) : "");
  const parsed = Number(minutes);
  const usable = Number.isFinite(parsed) && parsed > 0;
  const left = saved ? remainingMs(saved, now) : 0;
  const expired = Boolean(saved) && left <= 0;

  return (
    <div className="mt-6 border border-rule bg-white px-4 py-3">
      {!saved ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase">
            Timer
          </span>
          <label className="flex items-center gap-2 text-[0.85rem] text-ink-soft">
            <input
              type="number"
              min={1}
              max={180}
              value={minutes}
              onChange={(e) => setDraft(e.target.value)}
              className="w-16 border border-input bg-white px-2 py-1 text-[0.9rem] tabular-nums"
              aria-label="Minutes"
            />
            minutes
          </label>
          <button
            type="button"
            disabled={!usable}
            onClick={() => {
              if (!usable) return;
              setNow(Date.now());
              startTimer(problemId, parsed);
            }}
            className="border border-ink px-3 py-1 text-xs font-semibold tracking-wide uppercase transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-35"
          >
            Start
          </button>
          {usable && (
            <button
              type="button"
              onClick={() => setDefaultTimerMinutes(parsed)}
              className="text-[0.78rem] text-ink-soft underline underline-offset-2 hover:text-ink"
            >
              Save as my default
            </button>
          )}
          <span className="text-[0.78rem] text-ink-faint">
            Optional. Set whatever limit suits you.
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-baseline gap-3">
            <span className="text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase">
              {expired ? "Time is up" : "Time left"}
            </span>
            <span
              className={`text-xl tabular-nums ${expired ? "text-mark" : "text-ink"}`}
              aria-live="polite"
            >
              {formatDuration(left)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => clearTimer(problemId)}
            className="text-[0.78rem] text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Stop
          </button>
        </div>
      )}

      {expired && (
        <p className="mt-2 border-t border-rule pt-2 text-[0.85rem] text-ink-soft">
          Your time is up. Keep going if you want to. Nothing is locked, and time taken does not
          affect XP.
        </p>
      )}
    </div>
  );
}
