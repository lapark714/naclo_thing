import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, renderReport, hintsLeakAnswers } from "../../scripts/ingest/publish";
import type { Problem } from "../../content/schema";
import type { Flag } from "../../scripts/ingest/types";

function record(over: Partial<Problem> = {}): Problem {
  return {
    id: "2016-open-A", tier: "full", year: 2016, round: "open", letter: "A",
    title: "T", authors: ["X"], sourcePdfUrl: "https://naclo.org/practice.php",
    conceptTags: ["morphology"], formTag: "rosetta-stone", difficulty: "intro",
    languages: [], officialPoints: 5, officialTimeMinutes: 10,
    bodyHtml: "<p>body</p>", assets: [],
    questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "k", acceptedVariants: [], points: 1 }],
    hints: [
      { tier: 1, text: "one", xpCost: 1 },
      { tier: 2, text: "two", xpCost: 2 },
      { tier: 3, text: "three", xpCost: 3 },
    ],
    explanationHtml: "<p>why</p>", reviewStatus: "drafted",
    ...over,
  } as Problem;
}

test("a clean record publishes", () => {
  const o = decide(record(), []);
  assert.equal(o.status, "published");
  assert.equal(o.questionCount, 1);
});

test("any flag parks the record", () => {
  const flags: Flag[] = [{ kind: "diff", path: "q:A1.a:key", a: "x", b: "y" }];
  assert.equal(decide(record(), flags).status, "parked");
});

test("a record failing the schema parks even with no flags", () => {
  assert.equal(decide(record({ hints: [] } as Partial<Problem>), []).status, "parked");
});

test("a record with no byline parks", () => {
  assert.equal(decide(record({ authors: [] } as Partial<Problem>), []).status, "parked");
});

test("a hint that gives away a graded answer parks the record", () => {
  const leaky = record({
    questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "kecantikan", acceptedVariants: [], points: 1 }],
    hints: [
      { tier: 1, text: "Compare rows two and five.", xpCost: 1 },
      { tier: 2, text: "The suffix marks number.", xpCost: 2 },
      { tier: 3, text: "For example, the answer to a is kecantikan.", xpCost: 3 },
    ],
  } as Partial<Problem>);
  const o = decide(leaky, []);
  assert.equal(o.status, "parked");
  assert.ok(o.flags.some((f) => f.note?.includes("hint")));
});

test("a short answer key does not trip the leak check", () => {
  const short = record({
    questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "a", acceptedVariants: [], points: 1 }],
  } as Partial<Problem>);
  assert.equal(decide(short, []).status, "published");
});

test("the report lists parked ids with their reasons", () => {
  const out = renderReport(
    [
      { id: "2016-open-A", status: "published", flags: [], questionCount: 6 },
      { id: "2019-open-C", status: "parked", questionCount: 4,
        flags: [{ kind: "witness", path: "data:2", a: "ŋam", note: "not in text layer" }] },
    ],
    "2026-08-03",
  );
  assert.ok(out.includes("2026-08-03"));
  assert.ok(out.includes("1 published"));
  assert.ok(out.includes("1 parked"));
  assert.ok(out.includes("2019-open-C"));
  assert.ok(out.includes("ŋam"));
  assert.ok(!out.includes("2016-open-A\n\n"));
});

test("a key embedded in a longer word does not flag", () => {
  // "very" must not fire on "every" — the false positive found in
  // 2025-open-F, where the hint reads "almost every letter it produced".
  const r = record({
    questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "very", acceptedVariants: [], points: 1 }],
    hints: [
      { tier: 1, text: "Almost every letter it produced is right.", xpCost: 1 },
      { tier: 2, text: "Keep going.", xpCost: 2 },
      { tier: 3, text: "Nearly there.", xpCost: 3 },
    ],
  } as Partial<Problem>);
  assert.deepEqual(hintsLeakAnswers(r), []);
});

test("a key on the stopword list does not flag even when present as a standalone word", () => {
  // "with" appears as itself, not embedded — the second 2025-open-F false
  // positive, from a hint reading "the cipher text ends with F ZYEF".
  const r = record({
    questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "with", acceptedVariants: [], points: 1 }],
    hints: [
      { tier: 1, text: "The cipher text ends with an odd letter.", xpCost: 1 },
      { tier: 2, text: "Keep going.", xpCost: 2 },
      { tier: 3, text: "Nearly there.", xpCost: 3 },
    ],
  } as Partial<Problem>);
  assert.deepEqual(hintsLeakAnswers(r), []);
});

test("a distinctive multi-character key that genuinely appears still flags", () => {
  // The guard against over-correcting the check into uselessness: a hint
  // that really does name a graded answer must still be caught.
  const r = record({
    questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "kecantikan", acceptedVariants: [], points: 1 }],
    hints: [
      { tier: 1, text: "Compare rows two and five.", xpCost: 1 },
      { tier: 2, text: "The suffix marks number.", xpCost: 2 },
      { tier: 3, text: "The answer is kecantikan.", xpCost: 3 },
    ],
  } as Partial<Problem>);
  const flags = hintsLeakAnswers(r);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].a, "kecantikan");
});

test("a key containing regex metacharacters does not throw and behaves sensibly", () => {
  const withMeta = record({
    questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "a.b", acceptedVariants: [], points: 1 }],
    hints: [
      { tier: 1, text: "The pattern is a.b exactly.", xpCost: 1 },
      { tier: 2, text: "Keep going.", xpCost: 2 },
      { tier: 3, text: "Nearly there.", xpCost: 3 },
    ],
  } as Partial<Problem>);
  assert.doesNotThrow(() => hintsLeakAnswers(withMeta));
  assert.equal(hintsLeakAnswers(withMeta).length, 1);

  const withParens = record({
    questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "(x)", acceptedVariants: [], points: 1 }],
    hints: [
      { tier: 1, text: "Nothing like that appears here.", xpCost: 1 },
      { tier: 2, text: "Keep going.", xpCost: 2 },
      { tier: 3, text: "Nearly there.", xpCost: 3 },
    ],
  } as Partial<Problem>);
  assert.doesNotThrow(() => hintsLeakAnswers(withParens));
  assert.deepEqual(hintsLeakAnswers(withParens), []);
});

test("a non-ASCII key still flags when genuinely present", () => {
  const r = record({
    questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "ɲam", acceptedVariants: [], points: 1 }],
    hints: [
      { tier: 1, text: "Compare rows two and five.", xpCost: 1 },
      { tier: 2, text: "Look at the root.", xpCost: 2 },
      { tier: 3, text: "The word is ɲam in this language.", xpCost: 3 },
    ],
  } as Partial<Problem>);
  const flags = hintsLeakAnswers(r);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].a, "ɲam");
});
