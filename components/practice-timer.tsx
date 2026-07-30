"use client";

import { useEffect, useState } from "react";
import { clearTimer, formatDuration, readTimer, remainingMs, startTimer } from "@/lib/timer";
import { readProgress, setDefaultTimerMinutes } from "@/lib/progress";

/**
 * A pacing tool, not a punishment. At expiry a banner appears and the input
 * stays live — cutting someone off mid-thought interrupts them at the worst
 * possible moment.
 */
export function PracticeTimer({
  problemId,
  suggestedMinutes,
}: {
  problemId: string;
  suggestedMinutes: number;
}) {
  const [minutes, setMinutes] = useState(String(suggestedMinutes));
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState<number | null>(null);

  // Restore an in-flight timer after a refresh.
  useEffect(() => {
    const preset = readProgress().defaultTimerMinutes;
    if (preset) setMinutes(String(preset));

    const saved = readTimer(problemId);
    if (saved) {
      setRunning(true);
      setLeft(remainingMs(saved));
    }
  }, [problemId]);

  // Display tick. Remaining time is always recomputed from the timestamp.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const saved = readTimer(problemId);
      if (!saved) {
        setRunning(false);
        return;
      }
      setLeft(remainingMs(saved));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, problemId]);

  const expired = running && left !== null && left <= 0;

  return (
    <div className="mt-6 border border-rule bg-white px-4 py-3">
      {!running ? (
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
              onChange={(e) => setMinutes(e.target.value)}
              className="w-16 border border-input bg-white px-2 py-1 text-[0.9rem] tabular-nums"
              aria-label="Minutes"
            />
            minutes
          </label>
          <button
            type="button"
            onClick={() => {
              const m = Number(minutes);
              if (!Number.isFinite(m) || m <= 0) return;
              startTimer(problemId, m);
              setRunning(true);
              setLeft(m * 60_000);
            }}
            className="border border-ink px-3 py-1 text-xs font-semibold tracking-wide uppercase hover:bg-ink hover:text-paper"
          >
            Start
          </button>
          <button
            type="button"
            onClick={() => setDefaultTimerMinutes(Number(minutes) || null)}
            className="text-[0.78rem] text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Save as my default
          </button>
          <span className="text-[0.78rem] text-ink-faint">
            NACLO allows about {suggestedMinutes} minutes for this problem.
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
              {formatDuration(left ?? 0)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              clearTimer(problemId);
              setRunning(false);
              setLeft(null);
            }}
            className="text-[0.78rem] text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Stop
          </button>
        </div>
      )}

      {expired && (
        <p className="mt-2 border-t border-rule pt-2 text-[0.85rem] text-ink-soft">
          Your time is up. Keep going if you want to — nothing is locked, and time taken does not
          affect XP.
        </p>
      )}
    </div>
  );
}
