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

type Props = {
  problemId: string;
  question: ClientQuestion;
  onResolved: (questionId: string, correct: boolean, selfGraded: boolean) => void;
  /** Set when the whole part has been revealed from the help popover. */
  revealedAnswer?: string;
};

export function QuestionRow({ problemId, question, onResolved, revealedAnswer }: Props) {
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

  function reveal() {
    setVerdict({ state: "revealed" });
  }

  const useDropdown = (question.choices?.length ?? 0) > 5;

  return (
    <div className="border-t border-rule py-3 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <div
          className="data min-w-0 flex-1 basis-48 text-[0.98rem] font-semibold"
          dangerouslySetInnerHTML={{ __html: question.promptHtml }}
        />

        <div className="flex flex-1 basis-64 items-center gap-2">
          {question.gradingMode === "self" ? null : question.choices ? (
            useDropdown ? (
              <select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={settled}
                aria-label={`Answer for ${question.id}`}
                className="data w-full border border-input bg-white px-2 py-1.5 text-[0.92rem] disabled:opacity-70"
              >
                <option value="">Choose…</option>
                {question.choices.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {question.choices.map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={settled}
                    onClick={() => setValue(c)}
                    className={`data border px-2.5 py-1 text-[0.9rem] transition-colors ${
                      value === c
                        ? "border-ink bg-ink text-paper"
                        : "border-input bg-white hover:bg-tint"
                    } disabled:opacity-70`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={settled}
              aria-label={`Answer for ${question.id}`}
              spellCheck={false}
              autoComplete="off"
              className="data w-full border border-input bg-white px-2 py-1.5 text-[0.95rem] disabled:opacity-70"
            />
          )}

          {!settled && (
            <button
              type="button"
              onClick={check}
              disabled={verdict.state === "checking" || (!value && question.gradingMode !== "self")}
              className="shrink-0 border border-ink px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-35"
            >
              {question.gradingMode === "self"
                ? "Show key"
                : verdict.state === "checking"
                  ? "Checking"
                  : "Check"}
            </button>
          )}
        </div>
      </div>

      {revealedAnswer && verdict.state !== "correct" && (
        <p className="mt-1.5 text-[0.82rem] text-ink-soft">
          Answer: <span className="data font-semibold text-ink">{revealedAnswer}</span>
        </p>
      )}

      <Feedback
        verdict={verdict}
        question={question}
        onReveal={reveal}
        onSelfMark={(correct) => {
          setVerdict({ state: "correct" });
          onResolved(question.id, correct, true);
        }}
        flagged={flagged}
        onFlag={() => setFlagged(true)}
      />
    </div>
  );
}

function Feedback({
  verdict,
  question,
  onReveal,
  onSelfMark,
  flagged,
  onFlag,
}: {
  verdict: Verdict;
  question: ClientQuestion;
  onReveal: () => void;
  onSelfMark: (correct: boolean) => void;
  flagged: boolean;
  onFlag: () => void;
}) {
  if (verdict.state === "unanswered" || verdict.state === "checking") return null;

  if (verdict.state === "correct") {
    return (
      <p className="mt-1.5 text-[0.82rem] text-good">
        Correct{verdict.reason ? <span className="text-ink-soft">. {verdict.reason}</span> : null}
      </p>
    );
  }

  if (verdict.state === "revealed") {
    return (
      <div className="mt-2 border-l-2 border-rule-strong pl-3">
        <p className="text-[0.82rem] text-ink-soft">
          Key: <span className="data font-semibold text-ink">{question.answerKey}</span>
        </p>
        {question.rubric && (
          <p className="mt-1 text-[0.82rem] text-ink-soft">{question.rubric}</p>
        )}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => onSelfMark(true)}
            className="border border-rule-strong px-2.5 py-1 text-xs hover:bg-tint"
          >
            I got it
          </button>
          <button
            type="button"
            onClick={() => onSelfMark(false)}
            className="border border-rule-strong px-2.5 py-1 text-xs hover:bg-tint"
          >
            I did not
          </button>
        </div>
      </div>
    );
  }

  if (verdict.state === "error") {
    return (
      <div className="mt-2 border-l-2 border-rule-strong pl-3">
        <p className="text-[0.82rem] text-ink-soft">{verdict.reason}</p>
        <button
          type="button"
          onClick={onReveal}
          className="mt-1.5 border border-rule-strong px-2.5 py-1 text-xs hover:bg-tint"
        >
          Show key
        </button>
      </div>
    );
  }

  // incorrect
  return (
    <div className="mt-1.5">
      <p className="text-[0.82rem] text-mark">
        Not yet
        {verdict.reason ? <span className="text-ink-soft">. {verdict.reason}</span> : null}
      </p>
      <div className="mt-1 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onReveal}
          className="text-[0.78rem] text-ink-soft underline underline-offset-2 hover:text-ink"
        >
          Show key
        </button>
        {question.gradingMode === "llm" && !flagged && (
          <button
            type="button"
            onClick={onFlag}
            className="text-[0.78rem] text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            My answer was right
          </button>
        )}
        {flagged && (
          <span className="text-[0.78rem] text-ink-faint">
            Flagged for review. Thanks, a person checks every flag.
          </span>
        )}
      </div>
    </div>
  );
}
