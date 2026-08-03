/**
 * Stage 2 — compare what the two passes claim as fact.
 *
 * Only the factual layer is compared. Hints, explanations and prompts are
 * creative prose: two passes will word them differently every time, and
 * diffing them would bury the real signal in noise. They are constrained
 * elsewhere (three tiers, no answer revealed, no uncovered glyph) rather than
 * cross-checked. acceptedVariants is the same kind of creative judgment — a
 * list of alternate spellings the model invents, not a fact read off the
 * booklet — so it is excluded for the same reason, even though it lives on
 * the answer key that otherwise IS compared. Per-question points is derived
 * the same way, not read off the booklet: the drafting prompt distributes
 * officialPoints across questions using the official per-part breakdown when
 * the solution shows one, else evenly, so two passes that land on a
 * different question count are REQUIRED to divide points differently even
 * when every answer key agrees. The number that actually matters,
 * officialPoints, is pinned deterministically from the booklet header by
 * manifest.ts before either pass runs — it is never left to the model — so
 * there is nothing to cross-check here, only noise to skip.
 *
 * Data spans (data:count, data:<n>) are excluded for a different reason: not
 * because they don't matter, but because witness.ts already owns them with a
 * stronger check. Comparing pass A's span count against pass B's only tells
 * you the two models wrapped class="data" markup differently — a convention
 * choice, in the same family as acceptedVariants and per-question points.
 * The witness check instead verifies every one of pass A's spans against the
 * booklet's own pdftotext output, an independent source that cannot
 * hallucinate a glyph. That is a strictly stronger gate than two models
 * disagreeing, so this layer leaves language-data correctness to it entirely.
 *
 * Questions are paired by POSITION, not by id. Both passes transcribe the
 * booklet's questions in the order it prints them, but they routinely invent
 * different id schemes for the same question set — 2016-D had pass A write
 * `D1.a` where pass B wrote `D1.Althea-MainDish`, and 2016-E had one pass
 * number its twenty-one questions `E1.1..E1.21` while the other lettered the
 * same twenty-one `E1.a..E1.u`, despite the drafting prompt mandating
 * positional ids. Comparing by id then reads every question as absent from
 * the other pass — 40 spurious flags on 2016-E alone. Position is the join
 * key that actually holds, so pairing is done by index and only the winning
 * pass A's id is kept, for the emitted flag path. A question-count mismatch
 * is reported once, as `questions:count`, rather than per question: with a
 * different number of questions there is no meaningful pairing left to do,
 * and flagging every question as absent just multiplies one real
 * disagreement — how many questions are there? — into dozens of arbitration
 * calls to reach the same conclusion a human would reach immediately.
 */

import type { Problem } from "../../content/schema";
import type { Flag } from "./types";

export function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function tableCells(html: string): string[] {
  return [...html.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]));
}

export function dataSpans(html: string): string[] {
  const out = [...html.matchAll(/<span\b[^>]*class=["'][^"']*\bdata\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)]
    .map((m) => stripTags(m[1]));
  for (const m of html.matchAll(/<(dt|dd)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    out.push(stripTags(m[2]));
  }
  return out;
}

/**
 * Flattens a record to path to value over only the non-question fields that
 * state fact. Questions are handled separately, by diffQuestions: pairing
 * them requires both records at once (position only means something relative
 * to the other pass), so there is nothing a single-record flattening can do
 * for them.
 */
export function factualLayer(p: Problem): Map<string, string> {
  const m = new Map<string, string>();

  m.set(`cells:count`, String(tableCells(p.bodyHtml).length));
  tableCells(p.bodyHtml).forEach((cell, i) => m.set(`cell:${i}`, cell));

  // Counts, not src names: the two passes name their own asset files, so a
  // filename difference is not a defect. A count mismatch means one pass saw
  // a figure (a map, a glyph specimen) that the other missed entirely, which
  // neither the within-record CROP check nor validate.ts can catch, since a
  // record that omits a figure on both sides of that check is self-consistent.
  m.set(`assets:count`, String(p.assets.length));
  m.set(`figures:count`, String((p.bodyHtml.match(/<figure/g) ?? []).length));

  return m;
}

/** Flags one paired field between two same-indexed questions. */
function diffQuestionField(qid: string, field: string, va: string | undefined, vb: string | undefined, flags: Flag[]): void {
  if (va === undefined && vb === undefined) return;
  const path = `q:${qid}:${field}`;
  if (va === undefined) flags.push({ kind: "diff", path, b: vb, note: "absent in pass A" });
  else if (vb === undefined) flags.push({ kind: "diff", path, a: va, note: "absent in pass B" });
  else if (va !== vb) flags.push({ kind: "diff", path, a: va, b: vb });
}

/**
 * Compares the two records' questions by position — see the module header
 * for why id is not a reliable join key here.
 */
function diffQuestions(a: Problem, b: Problem): Flag[] {
  if (a.questions.length !== b.questions.length) {
    return [{
      kind: "diff",
      path: "questions:count",
      a: String(a.questions.length),
      b: String(b.questions.length),
      note: "differing question counts make a per-question comparison meaningless",
    }];
  }

  const flags: Flag[] = [];
  a.questions.forEach((qa, i) => {
    const qb = b.questions[i];
    // Lowercased, and always pass A's id: a proper name inside a question id
    // (a person, a place) routinely comes back capitalised by one pass and
    // not the other, and the two passes may not even agree on the naming
    // scheme, let alone the casing — that is not grounds to treat this as a
    // different question once it is paired by position. applyResolutions
    // matches back on this id case-insensitively too, so a resolution still
    // finds the record's actual (non-lowercased) question.
    const qid = qa.id.toLowerCase();
    diffQuestionField(qid, "mode", qa.gradingMode, qb.gradingMode, flags);
    diffQuestionField(qid, "key", qa.answerKey, qb.answerKey, flags);
    diffQuestionField(qid, "choices", qa.choices?.join("|"), qb.choices?.join("|"), flags);
  });
  return flags;
}

export function diffRecords(a: Problem, b: Problem): Flag[] {
  const fa = factualLayer(a);
  const fb = factualLayer(b);
  const flags: Flag[] = diffQuestions(a, b);
  const skipCells = fa.get("cells:count") !== fb.get("cells:count");

  for (const [path, va] of fa) {
    // Skip positional cell comparisons if the cell count mismatches, but always compare the count itself
    if (path.startsWith("cell:") && !path.endsWith(":count") && skipCells) {
      continue;
    }

    const vb = fb.get(path);
    if (vb === undefined) flags.push({ kind: "diff", path, a: va, note: "absent in pass B" });
    else if (vb !== va) flags.push({ kind: "diff", path, a: va, b: vb });
  }
  for (const [path, vb] of fb) {
    // Skip positional cell comparisons if the cell count mismatches, but always compare the count itself
    if (path.startsWith("cell:") && !path.endsWith(":count") && skipCells) {
      continue;
    }

    if (!fa.has(path)) flags.push({ kind: "diff", path, b: vb, note: "absent in pass A" });
  }
  return flags;
}
