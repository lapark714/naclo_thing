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
 * the answer key that otherwise IS compared.
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

/** Flattens a record to path to value over only the fields that state fact. */
export function factualLayer(p: Problem): Map<string, string> {
  const m = new Map<string, string>();

  for (const q of p.questions) {
    // Lowercased for the key only. The two passes transcribe the same
    // booklet independently, and a proper name inside a question id (a
    // person, a place) routinely comes back capitalised by one pass and not
    // the other — that is not a different question. Keying on the exact id
    // would read every field of that question as absent from both sides.
    // applyResolutions matches back on this id case-insensitively too, so a
    // resolution still finds the record's actual (non-lowercased) question.
    const qid = q.id.toLowerCase();
    m.set(`q:${qid}:mode`, q.gradingMode);
    m.set(`q:${qid}:key`, q.answerKey);
    m.set(`q:${qid}:points`, String(q.points));
    if (q.choices) m.set(`q:${qid}:choices`, q.choices.join("|"));
  }
  m.set(`cells:count`, String(tableCells(p.bodyHtml).length));
  tableCells(p.bodyHtml).forEach((cell, i) => m.set(`cell:${i}`, cell));
  m.set(`data:count`, String(dataSpans(p.bodyHtml).length));
  dataSpans(p.bodyHtml).forEach((d, i) => m.set(`data:${i}`, d));

  // Counts, not src names: the two passes name their own asset files, so a
  // filename difference is not a defect. A count mismatch means one pass saw
  // a figure (a map, a glyph specimen) that the other missed entirely, which
  // neither the within-record CROP check nor validate.ts can catch, since a
  // record that omits a figure on both sides of that check is self-consistent.
  m.set(`assets:count`, String(p.assets.length));
  m.set(`figures:count`, String((p.bodyHtml.match(/<figure/g) ?? []).length));

  return m;
}

export function diffRecords(a: Problem, b: Problem): Flag[] {
  const fa = factualLayer(a);
  const fb = factualLayer(b);
  const flags: Flag[] = [];
  const skipCells = fa.get("cells:count") !== fb.get("cells:count");
  const skipData = fa.get("data:count") !== fb.get("data:count");

  for (const [path, va] of fa) {
    // Skip positional comparisons for cells/data if count mismatches, but always compare the counts themselves
    if ((path.startsWith("cell:") && !path.endsWith(":count") && skipCells) ||
        (path.startsWith("data:") && !path.endsWith(":count") && skipData)) {
      continue;
    }

    const vb = fb.get(path);
    if (vb === undefined) flags.push({ kind: "diff", path, a: va, note: "absent in pass B" });
    else if (vb !== va) flags.push({ kind: "diff", path, a: va, b: vb });
  }
  for (const [path, vb] of fb) {
    // Skip positional comparisons for cells/data if count mismatches, but always compare the counts themselves
    if ((path.startsWith("cell:") && !path.endsWith(":count") && skipCells) ||
        (path.startsWith("data:") && !path.endsWith(":count") && skipData)) {
      continue;
    }

    if (!fa.has(path)) flags.push({ kind: "diff", path, b: vb, note: "absent in pass A" });
  }
  return flags;
}
