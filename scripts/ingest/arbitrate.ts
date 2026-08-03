/**
 * Stage 4 — resolve a disagreement with evidence neither pass had.
 *
 * One call per flag. The arbiter sees both candidates, the rendered pages, and
 * the surrounding text-layer excerpt, and must either pick a value or say
 * UNRESOLVED. Defaulting to UNRESOLVED is correct: an unresolved flag parks the
 * problem for a human, which is cheap, whereas a confidently wrong answer key
 * reaches a student.
 *
 * Never called for 2019. With no text layer there is no evidence beyond the
 * same images that produced the disagreement.
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import type { Problem } from "../../content/schema";
import { GradingMode } from "../../content/schema";
import type { Flag } from "./types";
import type { Target } from "./manifest";
import { normalizeForWitness } from "./witness";

export type Resolution = { path: string; value: string | null };

const MODEL = process.env.INGEST_MODEL || "claude-opus-5";

export function buildArbitrationPrompt(flag: Flag, textExcerpt: string): string {
  return [
    `Two independent transcriptions of this NACLO problem disagree about one value.`,
    ``,
    `Field: ${flag.path}`,
    `Candidate A: ${JSON.stringify(flag.a ?? "(absent)")}`,
    `Candidate B: ${JSON.stringify(flag.b ?? "(absent)")}`,
    flag.note ? `Note: ${flag.note}` : ``,
    ``,
    `Text extracted directly from the PDF near this value:`,
    `"""`,
    textExcerpt.slice(0, 2000),
    `"""`,
    ``,
    `Decide from the page images and that extracted text which value the`,
    `booklet actually prints. Pay attention to the exact characters: ɲ and ŋ`,
    `are different letters, as are ɾ and r, and a missing diacritic changes`,
    `the data.`,
    ``,
    `Reply with exactly one line, either:`,
    `VALUE: <the correct value>`,
    `or:`,
    `UNRESOLVED`,
    ``,
    `Answer UNRESOLVED unless the evidence is clear. A parked problem costs a`,
    `few minutes of review; a wrong answer key reaches a student.`,
  ].filter(Boolean).join("\n");
}

export function parseArbitrationReply(reply: string): string | null {
  const m = reply.trim().match(/^VALUE:\s*(.+)$/m);
  if (!m) return null;
  const value = m[1].trim();
  return value.length > 0 ? value : null;
}

/** Locates a small window of source text around a candidate, for context. */
function excerptFor(flag: Flag, pageText: string): string {
  const needle = normalizeForWitness(flag.a ?? flag.b ?? "");
  if (needle.length < 2) return pageText.slice(0, 2000);
  const flat = normalizeForWitness(pageText);
  const at = flat.indexOf(needle);
  if (at === -1) return pageText.slice(0, 2000);
  // Map back approximately: normalized indices run ahead of raw ones, so widen.
  const ratio = pageText.length / Math.max(1, flat.length);
  const centre = Math.floor(at * ratio);
  return pageText.slice(Math.max(0, centre - 600), centre + 600);
}

export function applyResolutions(
  p: Problem,
  resolutions: Resolution[],
): { record: Problem; unresolved: Flag[] } {
  const record: Problem = JSON.parse(JSON.stringify(p));
  const unresolved: Flag[] = [];

  for (const r of resolutions) {
    if (r.value === null) {
      unresolved.push({ kind: "diff", path: r.path, note: "arbitration returned UNRESOLVED" });
      continue;
    }
    const q = r.path.match(/^q:(.+):(key|mode|points|variants|choices)$/);
    if (q) {
      // diff.ts lowercases the question id when it builds this path (a name
      // like Althea transcribed as althea by the other pass is not a
      // different question), so the id captured here may not match the
      // record's stored casing. Compare case-insensitively, or every
      // resolution for a mixed-case id silently becomes "names no question
      // in the record" instead of being applied.
      const target = record.questions.find((x) => x.id.toLowerCase() === q[1].toLowerCase());
      if (!target) {
        unresolved.push({ kind: "diff", path: r.path, note: "names no question in the record" });
        continue;
      }
      if (q[2] === "key") target.answerKey = r.value;
      else if (q[2] === "mode") {
        const parsed = GradingMode.safeParse(r.value);
        if (!parsed.success) {
          unresolved.push({ kind: "diff", path: r.path, a: r.value, note: "arbitration returned an invalid grading mode" });
          continue;
        }
        target.gradingMode = parsed.data;
      } else if (q[2] === "points") {
        const n = Number(r.value);
        if (!Number.isFinite(n)) {
          unresolved.push({ kind: "diff", path: r.path, a: r.value, note: "arbitration returned a non-numeric value for points" });
          continue;
        }
        target.points = n;
      } else if (q[2] === "variants") target.acceptedVariants = r.value.split("|").filter(Boolean);
      else target.choices = r.value.split("|").filter(Boolean);
      continue;
    }
    // Table cells and data spans are positions inside generated HTML. Rewriting
    // them blind risks corrupting the markup, so they park for a human instead.
    unresolved.push({
      kind: "diff",
      path: r.path,
      a: r.value,
      note: "resolved, but this path is inside bodyHtml and is not written back automatically",
    });
  }
  return { record, unresolved };
}

export async function arbitrate(
  client: Anthropic,
  target: Target,
  flags: Flag[],
  pageImages: string[],
  pageText: string,
): Promise<Resolution[]> {
  const out: Resolution[] = [];

  for (const flag of flags) {
    const content: Anthropic.ContentBlockParam[] = [
      { type: "text", text: buildArbitrationPrompt(flag, excerptFor(flag, pageText)) },
      ...pageImages.map((p): Anthropic.ContentBlockParam => ({
        type: "image",
        source: { type: "base64", media_type: "image/png", data: readFileSync(p).toString("base64") },
      })),
    ];

    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 400,
        messages: [{ role: "user", content }],
      });
      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      out.push({ path: flag.path, value: parseArbitrationReply(text) });
    } catch (err) {
      console.error(`  arbitration failed for ${target.year}-${target.letter} ${flag.path}: ${(err as Error).message}`);
      out.push({ path: flag.path, value: null });
    }
  }
  return out;
}
