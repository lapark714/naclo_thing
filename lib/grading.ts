/**
 * Exact-match grading. Runs entirely in the browser: no network, no cost,
 * same answer every time.
 *
 * The normalisation has to be forgiving about typing and strict about
 * linguistics. A student typing "naguku" for "nagukú" has the right answer and
 * a keyboard without an acute accent, so combining marks are stripped. But we
 * never strip letters, because in these languages a different letter is a
 * different word.
 */

const APOSTROPHES = /[‘’ʼʻ`´]/g;
const HYPHENS = /[‐-―−]/g;

export function normalize(input: string): string {
  return input
    .normalize("NFD")
    // strip combining marks: macrons, acutes, diaereses, the lot
    .replace(/[̀-ͯ]/g, "")
    .replace(APOSTROPHES, "'")
    .replace(HYPHENS, "-")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    // trailing sentence punctuation carries no information here
    .replace(/[.!?]+$/, "");
}

export type ExactResult = {
  correct: boolean;
  /** True when the answer matched an accepted variant rather than the key. */
  viaVariant: boolean;
};

export function checkExact(
  answer: string,
  answerKey: string,
  acceptedVariants: string[] = [],
): ExactResult {
  const given = normalize(answer);
  if (!given) return { correct: false, viaVariant: false };

  if (given === normalize(answerKey)) return { correct: true, viaVariant: false };

  for (const variant of acceptedVariants) {
    if (given === normalize(variant)) return { correct: true, viaVariant: true };
  }
  return { correct: false, viaVariant: false };
}
