"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Hint } from "@/content/schema";
import type { ClientQuestion } from "@/lib/content";
import { QuestionRow } from "@/components/question-row";
import { HintLadder } from "@/components/hint-ladder";
import { PracticeTimer } from "@/components/practice-timer";
import { readProblem, updateProblem } from "@/lib/progress";

type Props = {
  problemId: string;
  bodyHtml: string;
  questions: ClientQuestion[];
  hints: Hint[];
  explanationHtml: string;
  officialPoints: number;
  officialTimeMinutes: number;
};

export function ProblemView({
  problemId,
  bodyHtml,
  questions,
  hints,
  explanationHtml,
  officialPoints,
  officialTimeMinutes,
}: Props) {
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    const saved = readProblem(problemId);
    setAnswered(saved.answered);
    setHintsRevealed(saved.hintsUsed);
    if (Object.keys(saved.answered).length > 0) setAttempted(true);
  }, [problemId]);

  // Group questions into parts. The rail is driven by this.
  const parts = useMemo(() => {
    const out: { key: string; prompt?: string; questions: ClientQuestion[] }[] = [];
    for (const q of questions) {
      const key = q.part ?? "—";
      const last = out[out.length - 1];
      if (last && last.key === key) last.questions.push(q);
      else out.push({ key, prompt: q.partPrompt, questions: [q] });
    }
    return out;
  }, [questions]);

  const hintCost = useMemo(
    () => hints.filter((h) => h.tier <= hintsRevealed).reduce((n, h) => n + h.xpCost, 0),
    [hints, hintsRevealed],
  );

  const correctCount = Object.values(answered).filter(Boolean).length;
  const allDone = correctCount === questions.length;

  const onResolved = useCallback(
    (questionId: string, correct: boolean, selfGraded: boolean) => {
      setAttempted(true);
      setAnswered((prev) => {
        const next = { ...prev, [questionId]: correct };
        const solvedCount = Object.values(next).filter(Boolean).length;
        const solved = solvedCount === questions.length;
        const earnedPoints = questions
          .filter((q) => next[q.id])
          .reduce((n, q) => n + q.points, 0);

        updateProblem(problemId, (p) => ({
          ...p,
          answered: next,
          solved,
          selfGraded: p.selfGraded || selfGraded,
          xpEarned: Math.max(0, Math.round(earnedPoints) - hintCost),
        }));
        return next;
      });
    },
    [problemId, questions, hintCost],
  );

  function revealHint(tier: number) {
    setHintsRevealed(tier);
    updateProblem(problemId, (p) => ({ ...p, hintsUsed: Math.max(p.hintsUsed, tier) }));
  }

  return (
    <>
      <div
        className="problem-body"
        // Transcribed, human-reviewed HTML from the content record.
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      <PracticeTimer problemId={problemId} suggestedMinutes={officialTimeMinutes} />

      <section aria-labelledby="questions-heading" className="mt-10">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-2">
          <h2
            id="questions-heading"
            className="text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase"
          >
            Questions
          </h2>
          <span className="text-[0.78rem] text-ink-soft tabular-nums">
            {correctCount} of {questions.length} correct
            {hintCost > 0 && <span className="text-mark"> · −{hintCost} XP from hints</span>}
          </span>
        </div>

        {parts.map((part) => (
          <div key={part.key} className="mb-8 flex gap-4 sm:gap-6">
            {/* The gutter rail: sub-question labels against a hairline rule,
                the way example lines are numbered in a linguistics paper. */}
            <div className="w-8 shrink-0 border-r border-rule pt-1 sm:w-12">
              <span className="text-[0.72rem] font-semibold tracking-wider text-ink-soft">
                {part.key}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              {part.prompt && (
                <p className="mb-3 max-w-[62ch] text-[0.92rem] text-ink-soft">{part.prompt}</p>
              )}
              {part.questions.map((q) => (
                <QuestionRow
                  key={q.id}
                  problemId={problemId}
                  question={q}
                  onResolved={onResolved}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <HintLadder hints={hints} revealed={hintsRevealed} onReveal={revealHint} />

      <section aria-labelledby="explanation-heading" className="mt-10">
        <h2
          id="explanation-heading"
          className="mb-3 text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase"
        >
          Explanation
        </h2>

        {showExplanation ? (
          <div
            className="problem-body border-t border-rule pt-4"
            dangerouslySetInnerHTML={{ __html: explanationHtml }}
          />
        ) : (
          <div className="border border-rule bg-white px-4 py-4">
            <p className="max-w-[58ch] text-[0.9rem] text-ink-soft">
              {allDone
                ? "You have every part. Here is how a solver would get there."
                : attempted
                  ? "The full walkthrough gives away the whole problem. Open it when you are done working."
                  : "Try the questions first. The walkthrough gives away the whole problem."}
            </p>
            <button
              type="button"
              onClick={() => setShowExplanation(true)}
              className="mt-3 border border-ink px-3 py-1.5 text-xs font-semibold tracking-wide uppercase hover:bg-ink hover:text-paper"
            >
              Show explanation
            </button>
            <p className="mt-2 text-[0.78rem] text-ink-faint">
              Free — reading the explanation costs no XP. Worth {officialPoints} points in the real
              exam.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
