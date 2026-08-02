"use client";

import { useState } from "react";
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

  const settled =
    verdict.state === "correct" || verdict.state === "revealed" || Boolean(revealedAnswer);

  async function check() {
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
    }
  }

  return {
    value,
    setValue,
    verdict,
    setVerdict,
    settled,
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
