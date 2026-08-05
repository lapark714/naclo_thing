"use client";

/**
 * Progress lives in localStorage. No account, no sign-up, nothing to forget.
 * The cost is that progress does not follow you between devices.
 */

import { useSyncExternalStore } from "react";

const KEY = "gloss.progress.v1";

export type ProblemProgress = {
  solved: boolean;
  xpEarned: number;
  /** Written hint tiers taken, 0–3. */
  hintsUsed: number;
  /** Request-time AI hints taken. Costs more per hint than the written ones. */
  aiHintsUsed: number;
  selfGraded: boolean;
  /** questionId -> whether it has been answered correctly */
  answered: Record<string, boolean>;
};

export type Progress = {
  problems: Record<string, ProblemProgress>;
  /** Default per-question timer in minutes, set once in settings. */
  defaultTimerMinutes: number | null;
};

const EMPTY: Progress = { problems: {}, defaultTimerMinutes: null };

export function blankProblem(): ProblemProgress {
  return {
    solved: false,
    xpEarned: 0,
    hintsUsed: 0,
    aiHintsUsed: 0,
    selfGraded: false,
    answered: {},
  };
}

export function readProgress(): Progress {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      problems: parsed.problems ?? {},
      defaultTimerMinutes: parsed.defaultTimerMinutes ?? null,
    };
  } catch {
    // A corrupt entry should never stop a student from practising.
    return EMPTY;
  }
}

function write(next: Progress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("gloss:progress"));
  } catch {
    // Private browsing and full quotas both land here. Losing progress is
    // better than breaking the page.
  }
}

export function readProblem(problemId: string): ProblemProgress {
  return readProgress().problems[problemId] ?? blankProblem();
}

export function updateProblem(
  problemId: string,
  patch: (prev: ProblemProgress) => ProblemProgress,
) {
  const all = readProgress();
  const prev = all.problems[problemId] ?? blankProblem();
  write({ ...all, problems: { ...all.problems, [problemId]: patch(prev) } });
}

export function setDefaultTimerMinutes(minutes: number | null) {
  write({ ...readProgress(), defaultTimerMinutes: minutes });
}

export function resetProblem(problemId: string) {
  const all = readProgress();
  const problems = { ...all.problems };
  delete problems[problemId];
  write({ ...all, problems });
}

/* ---------------------------------------------------------------------------
   Subscription. localStorage is the single source of truth, so components read
   it through useSyncExternalStore rather than copying it into local state on
   mount — that copy is what causes cascading renders and stale reads.
   --------------------------------------------------------------------------- */

function subscribe(onChange: () => void) {
  window.addEventListener("gloss:progress", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("gloss:progress", onChange);
    window.removeEventListener("storage", onChange);
  };
}

// getSnapshot must return a stable reference when nothing has changed, so the
// parsed value is memoised against the raw string.
let lastRaw: string | null = null;
let lastParsed: Progress = EMPTY;

function getSnapshot(): Progress {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === lastRaw) return lastParsed;
  lastRaw = raw;
  lastParsed = readProgress();
  return lastParsed;
}

function getServerSnapshot(): Progress {
  return EMPTY;
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useProblemProgress(problemId: string): ProblemProgress {
  return useProgress().problems[problemId] ?? EMPTY_PROBLEM;
}

const EMPTY_PROBLEM: ProblemProgress = {
  solved: false,
  xpEarned: 0,
  hintsUsed: 0,
  aiHintsUsed: 0,
  selfGraded: false,
  answered: {},
};

/**
 * Per-concept mastery: XP earned against XP available for each tag.
 *
 * Deliberately not a lifetime total. A running score only grows, so it says
 * nothing about where you stand and reads as a loss after a break, which is
 * why the product asks for coverage rather than a score. Earned-against-
 * available is bounded: every concept has a ceiling you can actually reach.
 *
 * It is also the first place XP is shown as something gained rather than
 * spent, and the only place taking a hint has a visible consequence — the
 * denominator does not move when you spend, so the fraction drops.
 */
export type Mastery = {
  earned: number;
  available: number;
  solved: number;
  total: number;
};

export function masteryByConcept(
  problems: { id: string; conceptTags: string[]; officialPoints: number }[],
  progress: Progress,
): Record<string, Mastery> {
  const out: Record<string, Mastery> = {};
  for (const problem of problems) {
    const p = progress.problems[problem.id];
    for (const tag of problem.conceptTags) {
      out[tag] ??= { earned: 0, available: 0, solved: 0, total: 0 };
      out[tag].available += problem.officialPoints;
      out[tag].total += 1;
      if (p) {
        out[tag].earned += p.xpEarned;
        if (p.solved) out[tag].solved += 1;
      }
    }
  }
  return out;
}

/** Per-concept coverage: how many problems carrying each tag are solved. */
export function coverageByConcept(
  problems: { id: string; conceptTags: string[] }[],
): Record<string, { solved: number; total: number }> {
  const progress = readProgress();
  const out: Record<string, { solved: number; total: number }> = {};
  for (const problem of problems) {
    const solved = progress.problems[problem.id]?.solved ?? false;
    for (const tag of problem.conceptTags) {
      out[tag] ??= { solved: 0, total: 0 };
      out[tag].total += 1;
      if (solved) out[tag].solved += 1;
    }
  }
  return out;
}
