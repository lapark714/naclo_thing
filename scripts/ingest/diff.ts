/**
 * Stage 2 — compare what the two passes claim as fact.
 *
 * Only the factual layer is compared. Hints, explanations and prompts are
 * creative prose: two passes will word them differently every time, and
 * diffing them would bury the real signal in noise. They are constrained
 * elsewhere (three tiers, no answer revealed, no uncovered glyph) rather than
 * cross-checked.
 */

import type { Problem } from "../../content/schema";
import type { Flag } from "./types";

export function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/\s+/g, " ")
    .trim();
}

export function tableCells(html: string): string[] {
  return [...html.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]));
}

export function dataSpans(html: string): string[] {
  const out = [...html.matchAll(/<span\b[^>]*class="[^"]*\bdata\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)]
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
    m.set(`q:${q.id}:mode`, q.gradingMode);
    m.set(`q:${q.id}:key`, q.answerKey);
    m.set(`q:${q.id}:points`, String(q.points));
    m.set(`q:${q.id}:variants`, [...q.acceptedVariants].sort().join("|"));
    if (q.choices) m.set(`q:${q.id}:choices`, q.choices.join("|"));
  }
  tableCells(p.bodyHtml).forEach((cell, i) => m.set(`cell:${i}`, cell));
  dataSpans(p.bodyHtml).forEach((d, i) => m.set(`data:${i}`, d));

  return m;
}

export function diffRecords(a: Problem, b: Problem): Flag[] {
  const fa = factualLayer(a);
  const fb = factualLayer(b);
  const flags: Flag[] = [];

  for (const [path, va] of fa) {
    const vb = fb.get(path);
    if (vb === undefined) flags.push({ kind: "diff", path, a: va, note: "absent in pass B" });
    else if (vb !== va) flags.push({ kind: "diff", path, a: va, b: vb });
  }
  for (const [path, vb] of fb) {
    if (!fa.has(path)) flags.push({ kind: "diff", path, b: vb, note: "absent in pass A" });
  }
  return flags;
}
