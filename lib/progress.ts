"use client";

/**
 * Progress lives in localStorage. No account, no sign-up, nothing to forget.
 * The cost is that progress does not follow you between devices.
 */

const KEY = "gloss.progress.v1";

export type ProblemProgress = {
  solved: boolean;
  xpEarned: number;
  hintsUsed: number;
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
  return { solved: false, xpEarned: 0, hintsUsed: 0, selfGraded: false, answered: {} };
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
  const { [problemId]: _removed, ...rest } = all.problems;
  write({ ...all, problems: rest });
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
