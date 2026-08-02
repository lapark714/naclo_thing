"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Hint } from "@/content/schema";
import type { ClientQuestion } from "@/lib/content";
import { QuestionRow } from "@/components/question-row";
import { InlineAnswer } from "@/components/inline-answer";
import { HelpPopover } from "@/components/help-popover";
import { PracticeTimer } from "@/components/practice-timer";
import { updateProblem, useProblemProgress } from "@/lib/progress";

/** Anything outside plain ASCII: the letters a US keyboard cannot produce. */
const NON_ASCII = /[^\u0000-\u007F]/;

/**
 * The slot a record leaves in its own body for the interface to fill:
 * `<span class="blank" data-q="F1.a"></span>`, exactly where the booklet
 * prints its blank. A record with no slots renders as it always did.
 */
function slotIds(html: string): Set<string> {
  const out = new Set<string>();
  for (const m of html.matchAll(/data-q="([^"]+)"/g)) out.add(m[1]);
  return out;
}

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
  const [revealedAnswers, setRevealedAnswers] = useState<
    Record<string, string>
  >({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [plainExplanation, setPlainExplanation] = useState<string | null>(null);
  const [plainBusy, setPlainBusy] = useState(false);

  /**
   * True when some answer needs a letter a US keyboard does not have (þ, ŋ, ɨ).
   * Every such record carries a plain-letter accepted variant — `validate.ts`
   * fails the build otherwise — but nothing on screen told the student that.
   */
  const needsPlainSpelling = useMemo(
    () =>
      questions.some((q) => !q.choices && NON_ASCII.test(q.answerKey ?? "")),
    [questions],
  );

  const parts = useMemo(() => {
    const out: { key: string; prompt?: string; questions: ClientQuestion[] }[] =
      [];
    for (const q of questions) {
      const key = q.part ?? "";
      const last = out[out.length - 1];
      if (last && last.key === key) last.questions.push(q);
      else out.push({ key, prompt: q.partPrompt, questions: [q] });
    }
    return out;
  }, [questions]);

  /* -------------------------------------------------------------------------
     Answering in place.

     A booklet prints its blank inside the sentence or the table cell, and that
     is where a student expects to write. Records mark those spots with empty
     slot elements; after the body is in the DOM we portal the real controls
     into them. The body HTML is never rebuilt, so the table structure the
     problem depends on stays exactly as authored.
     ------------------------------------------------------------------------- */

  const bodyRef = useRef<HTMLDivElement>(null);
  const inlineQuestionIds = useMemo(() => slotIds(bodyHtml), [bodyHtml]);
  const [blankSlots, setBlankSlots] = useState<HTMLElement[]>([]);
  const [helpSlots, setHelpSlots] = useState<[string, HTMLElement][]>([]);

  /**
   * Memoized so React keeps the identical element across re-renders and skips
   * reconciling this subtree. Without that it re-applies the innerHTML when
   * state changes, which silently replaces the slot nodes and leaves the
   * portals rendering into detached spans: inputs exist, but not on the page.
   */
  const body = useMemo(
    () => (
      <div
        ref={bodyRef}
        className="problem-body"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    ),
    [bodyHtml],
  );

  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;

    const blanks = [...root.querySelectorAll<HTMLElement>("[data-q]")];
    setBlankSlots(blanks);

    /**
     * A part answered in place needs its Hint beside those blanks rather than
     * at the foot of the page. Anchor it after the top-level block holding the
     * part's last blank, which is the table or paragraph just filled in.
     */
    const topLevel = [...root.children] as HTMLElement[];
    const lastBlockByPart = new Map<string, HTMLElement>();

    const anchorFor = (part: string, block: HTMLElement) => {
      const prev = lastBlockByPart.get(part);
      const at = topLevel.indexOf(block);
      if (!prev || topLevel.indexOf(prev) < at)
        lastBlockByPart.set(part, block);
    };

    for (const el of blanks) {
      const part = (el.getAttribute("data-q") as string).split(".", 1)[0];
      let block: HTMLElement = el;
      while (block.parentElement && block.parentElement !== root) {
        block = block.parentElement;
      }
      anchorFor(part, block);
    }

    // A booklet often prints the instruction after the table it refers to
    // ("F1. Fill in the blanks a. to g."). Sit below that too, so the Hint
    // never splits an instruction from the data it is about.
    for (const part of [...lastBlockByPart.keys()]) {
      for (const block of topLevel) {
        if (new RegExp(`^\\s*${part}[.\\s]`).test(block.textContent ?? "")) {
          anchorFor(part, block);
        }
      }
    }

    // Carry past a lead-in and its list ("Hints:" followed by a <ul>), so the
    // control never lands between a sentence and the list it introduces.
    for (const [part, block] of lastBlockByPart) {
      let end = block;
      const isList = (el: Element | null) =>
        el?.tagName === "UL" || el?.tagName === "OL";
      for (;;) {
        const next = end.nextElementSibling as HTMLElement | null;
        if (isList(next)) {
          end = next as HTMLElement;
          continue;
        }
        // A lead-in only counts when a list actually follows it. "Hints:" does;
        // "Here are some more sentences:" introduces the next table and must
        // not be swallowed into this part.
        if (
          next?.tagName === "P" &&
          /:\s*$/.test(next.textContent ?? "") &&
          isList(next.nextElementSibling)
        ) {
          end = next.nextElementSibling as HTMLElement;
          continue;
        }
        break;
      }
      lastBlockByPart.set(part, end);
    }

    const anchors: [string, HTMLElement][] = [];
    for (const [part, block] of lastBlockByPart) {
      const existing = root.querySelector<HTMLElement>(
        `[data-part-help="${part}"]`,
      );
      const anchor = existing ?? document.createElement("div");
      if (!existing) {
        anchor.setAttribute("data-part-help", part);
        block.after(anchor);
      }
      anchors.push([part, anchor]);
    }
    setHelpSlots(anchors);
  }, [bodyHtml]);

  /**
   * Every part still appears below, because that is where its Hint and reveal
   * live, but a part answered in place lists no rows: the whole complaint was
   * seeing the same blank twice.
   */
  const shownParts = useMemo(
    () =>
      parts.map((p) => {
        const remaining = p.questions.filter(
          (q) => !inlineQuestionIds.has(q.id),
        );
        return { ...p, remaining, allInline: remaining.length === 0 };
      }),
    [parts, inlineQuestionIds],
  );
  const anyListed = shownParts.some((p) => !p.allInline);

  const hintCost = useMemo(
    () =>
      hints
        .filter((h) => h.tier <= hintsRevealed)
        .reduce((n, h) => n + h.xpCost, 0) +
      aiHintsUsed * AI_HINT_COST,
    [hints, hintsRevealed, aiHintsUsed],
  );

  const correctCount = Object.values(answered).filter(Boolean).length;
  const allDone = correctCount === questions.length;

  const persist = useCallback(
    (
      next: Record<string, boolean>,
      revealed: string[],
      selfGraded: boolean,
      cost: number,
    ) => {
      const solved =
        Object.values(next).filter(Boolean).length === questions.length;
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
      persist(
        { ...answered, [questionId]: correct },
        revealedParts,
        selfGraded,
        hintCost,
      );
    },
    [persist, answered, revealedParts, hintCost],
  );

  function revealHint(tier: number) {
    updateProblem(problemId, (p) => ({
      ...p,
      hintsUsed: Math.max(p.hintsUsed, tier),
    }));
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
      {body}

      {blankSlots.map((el) => {
        const qid = el.getAttribute("data-q") as string;
        const q = questions.find((x) => x.id === qid);
        if (!q) return null;
        return createPortal(
          <InlineAnswer
            problemId={problemId}
            question={q}
            onResolved={onResolved}
            revealedAnswer={revealedAnswers[q.id]}
            label={el.getAttribute("data-label") ?? undefined}
          />,
          el,
          qid,
        );
      })}

      {helpSlots.map(([part, el]) => {
        const shown = shownParts.find((p) => p.key === part);
        if (!shown?.allInline) return null;
        return createPortal(
          <div className="mt-3 mb-6 flex items-baseline justify-between gap-3 border-t border-rule pt-3">
            <span className="text-[0.72rem] font-semibold tracking-wider text-ink-soft">
              {part}
            </span>
            <HelpPopover
              problemId={problemId}
              part={part}
              hints={hints}
              hintsRevealed={hintsRevealed}
              onRevealHint={revealHint}
              aiHintsUsed={aiHintsUsed}
              onAiHint={noteAiHint}
              onRevealPart={() => revealPart(part)}
              partRevealed={revealedParts.includes(part)}
            />
          </div>,
          el,
          `help-${part}`,
        );
      })}

      {/* Only worth saying when something is in fact answered further down. */}
      {anyListed && (
        <p className="mt-8 border-t border-rule pt-4 text-[0.9rem] leading-relaxed text-ink-soft">
          The rest of the questions are below, under{" "}
          <a
            href="#questions-heading"
            className="underline underline-offset-2 hover:text-ink"
          >
            Questions
          </a>
          .
        </p>
      )}

      <PracticeTimer
        problemId={problemId}
        suggestedMinutes={officialTimeMinutes}
      />

      <section aria-labelledby="questions-heading" className="mt-10">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-2">
          <h2
            id="questions-heading"
            className="text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase"
          >
            {anyListed ? "Questions" : "Progress"}
          </h2>
          <span className="text-[0.78rem] text-ink-soft tabular-nums">
            {correctCount} of {questions.length} correct
            {hintCost > 0 && (
              <span className="text-mark"> · −{hintCost} XP from help</span>
            )}
          </span>
        </div>

        {needsPlainSpelling && (
          <p className="mb-5 max-w-[58ch] text-[0.85rem] leading-relaxed text-ink-soft">
            Some answers use letters your keyboard does not have. Type the
            closest plain spelling instead and it still counts, and you can
            leave accents off.
          </p>
        )}

        {shownParts
          .filter((part) => !part.allInline)
          .map((part) => (
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
                    <p className="max-w-[58ch] text-[0.92rem] text-ink-soft">
                      {part.prompt}
                    </p>
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

                {part.remaining.map((q) => (
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
                  <p
                    key={i}
                    className="mb-2 max-w-[62ch] text-[0.92rem] leading-relaxed"
                  >
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
              Reading the explanation costs no XP. Worth {officialPoints} points
              in the real exam.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
