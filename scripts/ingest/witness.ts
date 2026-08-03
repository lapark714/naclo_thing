/**
 * Stage 3 — check the model's language data against the booklet's own text.
 *
 * This is the strongest gate here. A second model pass can repeat the first
 * one's misreading; the text layer cannot, because it does not read at all. It
 * either contains the character or it does not. Three of the five errors found
 * in the 2023 review batch were of exactly this shape: ɲ transcribed as ŋ,
 * and two characters silently dropped from a Hawaiian string.
 *
 * Deliberately scoped to body language data, which is verbatim from the
 * booklet. Answer keys are often translations or constructed values that never
 * appear in the source, so checking them here would flag constantly; the
 * two-pass diff covers them instead.
 *
 * Not run for 2019, whose booklets return a substitution cipher.
 */

import type { Problem } from "../../content/schema";
import type { Flag } from "./types";
import { dataSpans } from "./diff";

/** Whitespace is meaningless across a PDF line break; composition is not. */
export function normalizeForWitness(s: string): string {
  return s.normalize("NFC").replace(/[\s ​]+/g, "");
}

export function checkWitness(p: Problem, pageText: string): Flag[] {
  const haystack = normalizeForWitness(pageText);
  const flags: Flag[] = [];

  dataSpans(p.bodyHtml).forEach((token, i) => {
    const needle = normalizeForWitness(token);
    // One character is too common to be evidence either way.
    if (needle.length < 2) return;
    if (!haystack.includes(needle)) {
      flags.push({
        kind: "witness",
        path: `data:${i}`,
        a: token,
        note: "does not appear in the booklet text layer",
      });
    }
  });
  return flags;
}
