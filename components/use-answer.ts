"use client";

import { useRef, useState } from "react";
import type { ClientQuestion } from "@/lib/content";
import { checkExact } from "@/lib/grading";

export type Verdict =
  | { state: "unanswered" }
  | { state: "checking" }
  | { state: "correct"; reason?: string }
  | { state: "incorrect"; reason?: string }
  | { state: "revealed" }
  | { state: "error"; reason: string };

/**
 * One sub-question's answer state and grading, shared by the two places a
 * student can type: the blank inside the problem and the row in the questions
 * list. Same rules either way, so a problem cannot grade differently depending
 * on where you answered it.
 */
export function useAnswer(
  problemId: string,
  question: ClientQuestion,
  onResolved: (questionId: string, correct: boolean, selfGraded: boolean) => void,
  revealedAnswer?: string,
) {
  const [value, setValue] = useState("");
  const [verdict, setVerdict] = useState<Verdict>({ state: "unanswered" });
  const [flagged, setFlagged] = useState(false);

  /**
   * One grade at a time. The llm path is a network call behind a 20-per-minute
   * per-IP limiter, and that limiter is checked before the verdict cache, so a
   * held Enter key could spend a student's whole minute of grading on one
   * answer and then tell them the grader is down. A ref rather than state
   * because the guard has to be true for the next call in the same tick, before
   * any re-render.
   */
  const grading = useRef(false);

  const settled =
    verdict.state === "correct" || verdict.state === "revealed" || Boolean(revealedAnswer);

  /**
   * A verdict describes the answer that produced it. The moment the student
   * types a different one it is stale, and leaving it up means a red underline
   * and a "not yet" sitting under an answer nothing has judged. That was
   * survivable while a deliberate Check press was the only way to grade; with
   * Enter doing it, the stale verdict is the only feedback on screen.
   *
   * Only the unsettled verdicts clear. Correct and revealed disable the input,
   * so there is nothing to retype.
   */
  function edit(next: string) {
    setValue(next);
    setVerdict((v) =>
      v.state === "incorrect" || v.state === "error" ? { state: "unanswered" } : v,
    );
  }

  async function check() {
    if (grading.current) return;

    if (question.gradingMode === "exact") {
      const { correct } = checkExact(
        value,
        question.answerKey ?? "",
        question.acceptedVariants ?? [],
      );
      setVerdict({ state: correct ? "correct" : "incorrect" });
      if (correct) onResolved(question.id, true, false);
      return;
    }

    if (question.gradingMode === "self") {
      setVerdict({ state: "revealed" });
      return;
    }

    grading.current = true;
    setVerdict({ state: "checking" });
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId, questionId: question.id, answer: value }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setVerdict({
          state: "error",
          reason: body.error ?? "Grading is unavailable right now. Mark it yourself below.",
        });
        return;
      }
      const body = (await res.json()) as { correct: boolean; reason: string };
      setVerdict({ state: body.correct ? "correct" : "incorrect", reason: body.reason });
      if (body.correct) onResolved(question.id, true, false);
    } catch {
      setVerdict({
        state: "error",
        reason: "Could not reach the grader. Mark it yourself below.",
      });
    } finally {
      grading.current = false;
    }
  }

  /**
   * Whether pressing Enter in this question's input should grade it.
   *
   * Free text only, and only when the answer is graded in the browser. A choice
   * question has nothing to type into, so Enter has nothing to commit and the
   * button stays. An llm answer is a network call against a rate limit and a
   * paragraph of someone's reasoning: submitting that on a keystroke, where a
   * stray Enter mid-sentence spends a grade, is worse than asking for a press.
   */
  const gradesOnEnter =
    question.gradingMode === "exact" && (question.choices?.length ?? 0) === 0;

  return {
    value,
    setValue: edit,
    verdict,
    setVerdict,
    settled,
    gradesOnEnter,
    flagged,
    setFlagged,
    check,
    reveal: () => setVerdict({ state: "revealed" }),
    selfMark: (correct: boolean) => {
      setVerdict({ state: "correct" });
      onResolved(question.id, correct, true);
    },
  };
}
