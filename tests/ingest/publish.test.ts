import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, renderReport } from "../../scripts/ingest/publish";
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
