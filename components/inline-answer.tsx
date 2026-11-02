"use client";

import type { ClientQuestion } from "@/lib/content";
import { useAnswer } from "@/components/use-answer";

type Props = {
  problemId: string;
  question: ClientQuestion;
  onResolved: (
    questionId: string,
    correct: boolean,
    selfGraded: boolean,
  ) => void;
  revealedAnswer?: string;
  /** The blank's printed label, e.g. "(a)" or "a.", exactly as the booklet has it. */
  label?: string;
};

/**
 * The booklet labels each blank, and its instructions refer to those labels
 * ("fill in a. to g."). Without them on screen a student cannot tell which
 * blank the instruction means, so the label is shown beside its box.
 */
function Label({ label }: { label?: string }) {
  if (!label) return null;
  return <span className="mr-1 text-[0.85rem] text-ink-soft">{label}</span>;
}

/**
 * The answer box where the booklet prints its blank: inside the sentence, or in
 * the table cell that was left empty. A student reads "fill in a. to g." and
 * the thing to fill in is right there, which is how the paper works.
 *
 * Deliberately quieter than QuestionRow. It sits inside the problem's own data,
 * so it carries no prompt of its own and no permanent button: Enter checks, and
 * the Check button appears only once there is something to check.
 */
export function InlineAnswer({
  problemId,
  question,
  onResolved,
  revealedAnswer,
  label,
}: Props) {
  const { value, setValue, verdict, settled, check, reveal } = useAnswer(
    problemId,
    question,
    onResolved,
    revealedAnswer,
  );

  const border =
    verdict.state === "correct"
      ? "border-good"
      : verdict.state === "incorrect"
        ? "border-mark"
        : "border-rule-strong";

  // Once the answer is showing and nothing was typed, the empty box is just a
  // stray rule beside it.
  const keyOnly =
    !value && (Boolean(revealedAnswer) || verdict.state === "revealed");

  if (keyOnly) {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-1.5 align-baseline">
        <Label label={label} />
        <Trailing
          settled={settled}
          value={value}
          verdict={verdict}
          onCheck={check}
          onReveal={reveal}
          revealedAnswer={revealedAnswer}
          answerKey={question.answerKey}
        />
      </span>
    );
  }

  // Same threshold as the question rows: a short option set reads better as
  // buttons, and in a table cell two "G"/"U" buttons are far tighter than a
  // select whose placeholder is wider than any of its options.
  if (question.choices && question.choices.length <= 5) {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-1.5 align-baseline">
        <Label label={label} />
        <span className="inline-flex flex-wrap gap-1">
          {question.choices.map((c) => (
            <button
              key={c}
              type="button"
              disabled={settled}
              onClick={() => setValue(c)}
              className={`data border px-1.5 py-0.5 text-[0.9rem] transition-colors ${
                value === c
                  ? "border-ink bg-ink text-paper"
                  : "border-rule-strong bg-surface hover:bg-tint"
              } disabled:opacity-70`}
            >
              {c}
            </button>
          ))}
        </span>
        <Trailing
          settled={settled}
          value={value}
          verdict={verdict}
          onCheck={check}
          onReveal={reveal}
          revealedAnswer={revealedAnswer}
          answerKey={question.answerKey}
        />
      </span>
    );
  }

  if (question.choices) {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-1.5 align-baseline">
        <Label label={label} />
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={settled}
          aria-label={`Answer for ${question.id}`}
          className={`data border ${border} bg-surface px-1.5 py-0.5 text-[0.92rem] disabled:opacity-70`}
        >
          <option value="">Choose…</option>
          {question.choices.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Trailing
          settled={settled}
          value={value}
          verdict={verdict}
          onCheck={check}
          onReveal={reveal}
          revealedAnswer={revealedAnswer}
          answerKey={question.answerKey}
        />
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-1.5 align-baseline">
      <Label label={label} />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value && !settled) {
            e.preventDefault();
            void check();
          }
        }}
        disabled={settled}
        aria-label={`Answer for ${question.id}`}
        spellCheck={false}
        autoComplete="off"
        size={Math.min(Math.max(9, value.length + 1), 40)}
        className={`data max-w-full border-0 border-b ${border} bg-transparent px-1 py-0.5 text-[0.95rem] focus:outline-2 focus:outline-offset-2 focus:outline-ink disabled:opacity-70`}
      />
      <Trailing
        settled={settled}
        value={value}
        verdict={verdict}
        onCheck={check}
        onReveal={reveal}
        revealedAnswer={revealedAnswer}
        answerKey={question.answerKey}
      />
    </span>
  );
}

function Trailing({
  settled,
  value,
  verdict,
  onCheck,
  onReveal,
  revealedAnswer,
  answerKey,
}: {
  settled: boolean;
  value: string;
  verdict: ReturnType<typeof useAnswer>["verdict"];
  onCheck: () => void;
  onReveal: () => void;
  revealedAnswer?: string;
  answerKey?: string;
}) {
  if (revealedAnswer && verdict.state !== "correct") {
    return (
      <span className="data text-[0.85rem] font-semibold text-ink">
        {revealedAnswer}
      </span>
    );
  }

  if (verdict.state === "revealed") {
    return (
      <span className="data text-[0.85rem] font-semibold text-ink">
        {answerKey}
      </span>
    );
  }

  if (verdict.state === "correct") {
    return <span className="text-[0.78rem] text-good-deep">correct</span>;
  }

  if (verdict.state === "checking") {
    return <span className="text-[0.78rem] text-ink-soft">checking</span>;
  }

  if (verdict.state === "incorrect" || verdict.state === "error") {
    return (
      <span className="inline-flex items-baseline gap-2">
        <span className="text-[0.78rem] text-mark">
          {verdict.state === "error" ? "grader down" : "not yet"}
        </span>
        <button
          type="button"
          onClick={onCheck}
          className="border border-rule-strong px-1.5 py-0.5 text-[0.68rem] font-semibold tracking-wide uppercase hover:bg-tint"
        >
          Recheck
        </button>
        <button
          type="button"
          onClick={onReveal}
          className="text-[0.78rem] text-ink-soft underline underline-offset-2 hover:text-ink"
        >
          Show key
        </button>
      </span>
    );
  }

  if (settled || !value) return null;

  return (
    <button
      type="button"
      onClick={onCheck}
      className="border border-ink px-1.5 py-0.5 text-[0.68rem] font-semibold tracking-wide uppercase transition-colors hover:bg-ink hover:text-paper"
    >
      Check
    </button>
  );
}
