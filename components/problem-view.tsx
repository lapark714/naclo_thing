"use client";

import { useCallback, useMemo, useState } from "react";
import type { Hint } from "@/content/schema";
import type { ClientQuestion } from "@/lib/content";
import { QuestionRow } from "@/components/question-row";
import { HelpPopover } from "@/components/help-popover";
import { PracticeTimer } from "@/components/practice-timer";
import { updateProblem, useProblemProgress } from "@/lib/progress";

/** Anything outside plain ASCII: the letters a US keyboard cannot produce. */
const NON_ASCII = /[^\u0000-\u007F]/;

type Props = {
  problemId: string;
  bodyHtml: string;
  questions: ClientQuestion[];
  hints: Hint[];
  explanationHtml: string;
  officialPoints: number;
  officialTimeMinutes: number;
};

const AI_HINT_COST = 2;

export function ProblemView({
  problemId,
  bodyHtml,
  questions,
  hints,
  explanationHtml,
  officialPoints,
  officialTimeMinutes,
}: Props) {
  // localStorage is the single source of truth for anything scored.
  const saved = useProblemProgress(problemId);
  const answered = saved.answered;
  const hintsRevealed = saved.hintsUsed;
  const aiHintsUsed = saved.aiHintsUsed;
  const attempted = Object.keys(answered).length > 0;

  const [revealedParts, setRevealedParts] = useState<string[]>([]);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, string>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [plainExplanation, setPlainExplanation] = useState<string | null>(null);
  const [plainBusy, setPlainBusy] = useState(false);

  /**
   * True when some answer needs a letter a US keyboard does not have (þ, ŋ, ɨ).
   * Every such record carries a plain-letter accepted variant — `validate.ts`
   * fails the build otherwise — but nothing on screen told the student that.
   */
  const needsPlainSpelling = useMemo(
    () => questions.some((q) => !q.choices && NON_ASCII.test(q.answerKey ?? "")),
    [questions],
  );

  const parts = useMemo(() => {
    const out: { key: string; prompt?: string; questions: ClientQuestion[] }[] = [];
    for (const q of questions) {
      const key = q.part ?? "";
      const last = out[out.length - 1];
      if (last && last.key === key) last.questions.push(q);
      else out.push({ key, prompt: q.partPrompt, questions: [q] });
    }
    return out;
  }, [questions]);

  const hintCost = useMemo(
    () =>
      hints.filter((h) => h.tier <= hintsRevealed).reduce((n, h) => n + h.xpCost, 0) +
      aiHintsUsed * AI_HINT_COST,
    [hints, hintsRevealed, aiHintsUsed],
  );

  const correctCount = Object.values(answered).filter(Boolean).length;
  const allDone = correctCount === questions.length;

  const persist = useCallback(
    (next: Record<string, boolean>, revealed: string[], selfGraded: boolean, cost: number) => {
      const solved = Object.values(next).filter(Boolean).length === questions.length;
      // Revealed parts earn nothing, which is the whole point of the trade.
      const earned = questions
        .filter((q) => next[q.id] && !revealed.includes(q.part ?? ""))
        .reduce((n, q) => n + q.points, 0);

      updateProblem(problemId, (p) => ({
        ...p,
        answered: next,
        solved,
        selfGraded: p.selfGraded || selfGraded,
        xpEarned: Math.max(0, Math.round(earned) - cost),
      }));
    },
    [problemId, questions],
  );

  const onResolved = useCallback(
    (questionId: string, correct: boolean, selfGraded: boolean) => {
      persist({ ...answered, [questionId]: correct }, revealedParts, selfGraded, hintCost);
    },
    [persist, answered, revealedParts, hintCost],
  );

  function revealHint(tier: number) {
    updateProblem(problemId, (p) => ({ ...p, hintsUsed: Math.max(p.hintsUsed, tier) }));
  }

  function noteAiHint() {
    updateProblem(problemId, (p) => ({ ...p, aiHintsUsed: p.aiHintsUsed + 1 }));
  }

  async function revealPart(part: string) {
    try {
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId, part, mode: "reveal" }),
      });
      const body = (await res.json()) as { answers?: Record<string, string> };
      if (body.answers) {
        setRevealedAnswers((prev) => ({ ...prev, ...body.answers }));
        const nextRevealed = [...revealedParts, part];
        setRevealedParts(nextRevealed);
        persist(answered, nextRevealed, false, hintCost);
      }
    } catch {
      // Leave the popover as it was; the student can try again.
    }
  }

  async function explainPlainly() {
    setPlainBusy(true);
    try {
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId, mode: "explain" }),
      });
      const body = (await res.json()) as { text?: string };
      if (body.text) setPlainExplanation(body.text);
    } catch {
      /* the written explanation is already on screen */
    } finally {
      setPlainBusy(false);
    }
  }

  return (
    <>
      <div className="problem-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

      {/* The blanks in a booklet are printed as bare letters in a table cell, so
          a student reads "fill in a. to g." with nothing on screen to fill in.
          The boxes are below, past the timer, and nothing said so. */}
      <p className="mt-8 border-t border-rule pt-4 text-[0.9rem] leading-relaxed text-ink-soft">
        You answer below, under{" "}
        <a
          href="#questions-heading"
          className="underline underline-offset-2 hover:text-ink"
        >
          Questions
        </a>
        . Every blank has its own box there, labeled with the same letter as the
        problem.
      </p>

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
            {hintCost > 0 && <span className="text-mark"> · −{hintCost} XP from help</span>}
          </span>
        </div>

        {needsPlainSpelling && (
          <p className="mb-5 max-w-[58ch] text-[0.85rem] leading-relaxed text-ink-soft">
            Some answers use letters your keyboard does not have. Type the
            closest plain spelling instead and it still counts, and you can
            leave accents off.
          </p>
        )}

        {parts.map((part) => (
          <div key={part.key} className="mb-8 flex gap-4 sm:gap-6">
            {/* The gutter rail: part labels against a hairline rule. */}
            <div className="w-8 shrink-0 border-r border-rule pt-1 sm:w-12">
              <span className="text-[0.72rem] font-semibold tracking-wider text-ink-soft">
                {part.key}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-start justify-between gap-3">
                {part.prompt ? (
                  <p className="max-w-[58ch] text-[0.92rem] text-ink-soft">{part.prompt}</p>
                ) : (
                  <span />
                )}
                <div className="shrink-0">
                  <HelpPopover
                    problemId={problemId}
                    part={part.key}
                    hints={hints}
                    hintsRevealed={hintsRevealed}
                    onRevealHint={revealHint}
                    aiHintsUsed={aiHintsUsed}
                    onAiHint={noteAiHint}
                    onRevealPart={() => revealPart(part.key)}
                    partRevealed={revealedParts.includes(part.key)}
                  />
                </div>
              </div>

              {part.questions.map((q) => (
                <QuestionRow
                  key={q.id}
                  problemId={problemId}
                  question={q}
                  onResolved={onResolved}
                  revealedAnswer={revealedAnswers[q.id]}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section aria-labelledby="explanation-heading" className="mt-10">
        <h2
          id="explanation-heading"
          className="mb-3 text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase"
        >
          Explanation
        </h2>

        {showExplanation ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-2">
              <span className="text-[0.8rem] text-ink-soft">
                The full walkthrough, written for this problem.
              </span>
              {!plainExplanation && (
                <button
                  type="button"
                  onClick={explainPlainly}
                  disabled={plainBusy}
                  className="border border-rule-strong px-2.5 py-1 text-[0.75rem] hover:border-ink disabled:opacity-40"
                >
                  {plainBusy ? "Writing…" : "Explain this more simply"}
                </button>
              )}
            </div>

            {plainExplanation && (
              <div className="mt-4 border-l-2 border-ink bg-tint/50 py-3 pl-4">
                <p className="mb-2 text-[0.7rem] font-semibold tracking-[0.1em] text-ink-soft uppercase">
                  In plain words
                </p>
                {plainExplanation.split(/\n{2,}/).map((para, i) => (
                  <p key={i} className="mb-2 max-w-[62ch] text-[0.92rem] leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            )}

            <div
              className="problem-body mt-4"
              dangerouslySetInnerHTML={{ __html: explanationHtml }}
            />
          </>
        ) : (
          <div className="border border-rule bg-white px-4 py-4">
            <p className="max-w-[58ch] text-[0.9rem] text-ink-soft">
              {allDone
                ? "You have every part. Read how a solver would get there."
                : attempted
                  ? "The full walkthrough gives away the whole problem. Open it when you are done working."
                  : "Try the questions first. Use the Hint button next to any part if you need a nudge."}
            </p>
            <button
              type="button"
              onClick={() => setShowExplanation(true)}
              className="mt-3 border border-ink px-3 py-1.5 text-xs font-semibold tracking-wide uppercase hover:bg-ink hover:text-paper"
            >
              Show explanation
            </button>
            <p className="mt-2 text-[0.78rem] text-ink-faint">
              Reading the explanation costs no XP. Worth {officialPoints} points in the real
              exam.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
