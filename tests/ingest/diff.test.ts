import { test } from "node:test";
import assert from "node:assert/strict";
import { stripTags, tableCells, dataSpans, diffRecords } from "../../scripts/ingest/diff";
import { applyResolutions } from "../../scripts/ingest/arbitrate";
import type { Problem } from "../../content/schema";
import type { Question } from "../../content/schema";

function record(over: Partial<Problem> = {}): Problem {
  return {
    id: "2016-open-A", tier: "full", year: 2016, round: "open", letter: "A",
    title: "T", authors: ["X"], sourcePdfUrl: "https://naclo.org/practice.php",
    conceptTags: ["morphology"], formTag: "rosetta-stone", difficulty: "intro",
    languages: [], officialPoints: 5, officialTimeMinutes: 10,
    bodyHtml: "", assets: [],
    questions: [{
      id: "A1.a", promptHtml: "p", gradingMode: "exact",
      answerKey: "kecantikan", acceptedVariants: [], points: 1,
    }],
    hints: [], explanationHtml: "", reviewStatus: "drafted",
    ...over,
  } as Problem;
}

test("stripTags removes markup and collapses whitespace", () => {
  assert.equal(stripTags("<b>ha</b>\n  <i>lo</i>"), "ha lo");
  assert.equal(stripTags("a &amp; b"), "a & b");
});

test("tableCells reads cells in document order", () => {
  const html = "<table><tr><th>a</th><td>b</td></tr><tr><td>c</td></tr></table>";
  assert.deepEqual(tableCells(html), ["a", "b", "c"]);
});

test("dataSpans collects data spans and gloss-list terms", () => {
  const html = '<p><span class="data">marlu</span></p><dl><dt>hąąhere</dt><dd>fish</dd></dl>';
  assert.deepEqual(dataSpans(html), ["marlu", "hąąhere", "fish"]);
});

test("identical records produce no flags", () => {
  assert.deepEqual(diffRecords(record(), record()), []);
});

test("a differing answer key is flagged with both candidates", () => {
  const flags = diffRecords(
    record(),
    record({ questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "kecantikaan", acceptedVariants: [], points: 1 }] } as Partial<Problem>),
  );
  assert.equal(flags.length, 1);
  assert.equal(flags[0].path, "q:a1.a:key");
  assert.equal(flags[0].a, "kecantikan");
  assert.equal(flags[0].b, "kecantikaan");
});

test("records differing only in acceptedVariants produce no flags", () => {
  const flags = diffRecords(
    record({ questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "kecantikan", acceptedVariants: [], points: 1 }] } as Partial<Problem>),
    record({ questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "kecantikan", acceptedVariants: ["Kecantikan bukan hadiah"], points: 1 }] } as Partial<Problem>),
  );
  assert.deepEqual(flags, []);
});

test("a record differing in acceptedVariants AND answerKey still flags the answer key", () => {
  const flags = diffRecords(
    record({ questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "kecantikan", acceptedVariants: [], points: 1 }] } as Partial<Problem>),
    record({ questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "kecantikaan", acceptedVariants: ["Kecantikan bukan hadiah"], points: 1 }] } as Partial<Problem>),
  );
  assert.equal(flags.length, 1);
  assert.equal(flags[0].path, "q:a1.a:key");
  assert.equal(flags[0].a, "kecantikan");
  assert.equal(flags[0].b, "kecantikaan");
});

test("records differing only in per-question points produce no flags", () => {
  const flags = diffRecords(
    record({ questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "kecantikan", acceptedVariants: [], points: 0.65 }] } as Partial<Problem>),
    record({ questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "kecantikan", acceptedVariants: [], points: 0.74 }] } as Partial<Problem>),
  );
  assert.deepEqual(flags, []);
});

test("a record differing in points AND answerKey still flags only the answer key", () => {
  const flags = diffRecords(
    record({ questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "kecantikan", acceptedVariants: [], points: 0.65 }] } as Partial<Problem>),
    record({ questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "kecantikaan", acceptedVariants: [], points: 0.74 }] } as Partial<Problem>),
  );
  assert.equal(flags.length, 1);
  assert.equal(flags[0].path, "q:a1.a:key");
  assert.equal(flags[0].a, "kecantikan");
  assert.equal(flags[0].b, "kecantikaan");
});

test("differing prose does NOT flag", () => {
  const flags = diffRecords(
    record({ explanationHtml: "<p>one way of saying it</p>", hints: [{ tier: 1, text: "look here", xpCost: 1 }] } as Partial<Problem>),
    record({ explanationHtml: "<p>quite another</p>", hints: [{ tier: 1, text: "look there", xpCost: 1 }] } as Partial<Problem>),
  );
  assert.deepEqual(flags, []);
});

test("differing question counts produce exactly one questions:count flag, no per-question flags", () => {
  const flags = diffRecords(record(), record({ questions: [] } as Partial<Problem>));
  assert.equal(flags.length, 1);
  assert.equal(flags[0].path, "questions:count");
  assert.equal(flags[0].a, "1");
  assert.equal(flags[0].b, "0");
});

test("a bigger question-count mismatch still produces exactly one flag, not a cascade", () => {
  const manyA: Question[] = Array.from({ length: 18 }, (_, i) => ({
    id: `B1.${i + 1}`, promptHtml: "p", gradingMode: "exact",
    answerKey: "x", acceptedVariants: [], points: 1,
  }));
  const fewB: Question[] = Array.from({ length: 6 }, (_, i) => ({
    id: `B1.${i + 1}`, promptHtml: "p", gradingMode: "exact",
    answerKey: "x", acceptedVariants: [], points: 1,
  }));
  const flags = diffRecords(
    record({ questions: manyA } as Partial<Problem>),
    record({ questions: fewB } as Partial<Problem>),
  );
  assert.equal(flags.length, 1);
  assert.equal(flags[0].path, "questions:count");
  assert.equal(flags[0].a, "18");
  assert.equal(flags[0].b, "6");
  assert.ok(flags[0].note?.includes("meaningless"));
});

test("same questions in the same order but completely different id schemes, identical answers: no flags", () => {
  const a: Question[] = Array.from({ length: 21 }, (_, i) => ({
    id: `E1.${i + 1}`, promptHtml: "p", gradingMode: "exact",
    answerKey: `answer-${i}`, acceptedVariants: [], points: 1,
  }));
  const letters = "abcdefghijklmnopqrstu".split("");
  const b: Question[] = Array.from({ length: 21 }, (_, i) => ({
    id: `E1.${letters[i]}`, promptHtml: "p", gradingMode: "exact",
    answerKey: `answer-${i}`, acceptedVariants: [], points: 1,
  }));
  const flags = diffRecords(
    record({ questions: a } as Partial<Problem>),
    record({ questions: b } as Partial<Problem>),
  );
  assert.deepEqual(flags, []);
});

test("same positional questions, different id schemes, one answer key differing: exactly one flag naming that key, using pass A's id", () => {
  const a: Question[] = [
    { id: "E1.1", promptHtml: "p", gradingMode: "exact", answerKey: "cat", acceptedVariants: [], points: 1 },
    { id: "E1.2", promptHtml: "p", gradingMode: "exact", answerKey: "dog", acceptedVariants: [], points: 1 },
  ];
  const b: Question[] = [
    { id: "E1.a", promptHtml: "p", gradingMode: "exact", answerKey: "cat", acceptedVariants: [], points: 1 },
    { id: "E1.b", promptHtml: "p", gradingMode: "exact", answerKey: "doge", acceptedVariants: [], points: 1 },
  ];
  const flags = diffRecords(
    record({ questions: a } as Partial<Problem>),
    record({ questions: b } as Partial<Problem>),
  );
  assert.equal(flags.length, 1);
  assert.equal(flags[0].path, "q:e1.2:key");
  assert.equal(flags[0].a, "dog");
  assert.equal(flags[0].b, "doge");
});

test("same positional questions still catch a gradingMode difference and a choices difference", () => {
  const a: Question[] = [
    { id: "E1.1", promptHtml: "p", gradingMode: "exact", answerKey: "cat", acceptedVariants: [], points: 1, choices: ["cat", "dog"] },
    { id: "E1.2", promptHtml: "p", gradingMode: "exact", answerKey: "dog", acceptedVariants: [], points: 1 },
  ];
  const b: Question[] = [
    { id: "E1.a", promptHtml: "p", gradingMode: "self", answerKey: "cat", acceptedVariants: [], points: 1, choices: ["cat", "dog", "bird"] },
    { id: "E1.b", promptHtml: "p", gradingMode: "exact", answerKey: "dog", acceptedVariants: [], points: 1 },
  ];
  const flags = diffRecords(
    record({ questions: a } as Partial<Problem>),
    record({ questions: b } as Partial<Problem>),
  );
  assert.equal(flags.length, 2);
  const mode = flags.find((f) => f.path === "q:e1.1:mode");
  assert.ok(mode, "expected a q:e1.1:mode flag");
  assert.equal(mode?.a, "exact");
  assert.equal(mode?.b, "self");
  const choices = flags.find((f) => f.path === "q:e1.1:choices");
  assert.ok(choices, "expected a q:e1.1:choices flag");
  assert.equal(choices?.a, "cat|dog");
  assert.equal(choices?.b, "cat|dog|bird");
});

test("a q:<id>:key path emitted by diffRecords is parseable and resolvable by applyResolutions", () => {
  const a = record({
    questions: [{ id: "E1.1", promptHtml: "p", gradingMode: "exact", answerKey: "cat", acceptedVariants: [], points: 1 }],
  } as Partial<Problem>);
  const b = record({
    questions: [{ id: "E1.a", promptHtml: "p", gradingMode: "exact", answerKey: "dog", acceptedVariants: [], points: 1 }],
  } as Partial<Problem>);
  const flags = diffRecords(a, b);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].path, "q:e1.1:key");
  assert.equal(flags[0].a, "cat");
  assert.equal(flags[0].b, "dog");

  // applyResolutions only writes a :key resolution when the arbitrated value
  // matches one of the flag's own candidates (Finding 5) — arbitrate() carries
  // a/b through onto the Resolution it builds from this exact flag, so a real
  // resolution for this path looks like this, not an invented third value.
  const { record: resolved, unresolved } = applyResolutions(a, [
    { path: flags[0].path, value: "cat", a: flags[0].a, b: flags[0].b },
  ]);
  assert.deepEqual(unresolved, []);
  assert.equal(resolved.questions[0].answerKey, "cat");
});

test("a differing table cell is flagged", () => {
  const flags = diffRecords(
    record({ bodyHtml: "<table><tr><td>ɲam</td></tr></table>" } as Partial<Problem>),
    record({ bodyHtml: "<table><tr><td>ŋam</td></tr></table>" } as Partial<Problem>),
  );
  assert.equal(flags.length, 1);
  assert.equal(flags[0].a, "ɲam");
  assert.equal(flags[0].b, "ŋam");
});

test("stripTags decodes entities in correct order (decode &lt;/&gt; before &amp;)", () => {
  assert.equal(stripTags("&amp;lt;"), "&lt;");
});

test("dataSpans accepts single-quoted class attributes", () => {
  const html = "<p><span class='data'>marlu</span></p>";
  assert.deepEqual(dataSpans(html), ["marlu"]);
});

test("cell count mismatch produces exactly one flag, skips positional comparison", () => {
  const flags = diffRecords(
    record({ bodyHtml: "<table><tr><td>a</td><td>b</td></tr></table>" } as Partial<Problem>),
    record({ bodyHtml: "<table><tr><td>x</td></tr></table>" } as Partial<Problem>),
  );
  assert.equal(flags.length, 1);
  assert.equal(flags[0].path, "cells:count");
  assert.equal(flags[0].a, "2");
  assert.equal(flags[0].b, "1");
});

test("records differing only in their data spans produce no flags: the witness owns that check", () => {
  const flags = diffRecords(
    record({ bodyHtml: '<p><span class="data">a</span><span class="data">b</span></p>' } as Partial<Problem>),
    record({ bodyHtml: '<p><span class="data">x</span></p>' } as Partial<Problem>),
  );
  assert.deepEqual(flags, []);
});

test("per-index cell comparison still happens when counts match", () => {
  const flags = diffRecords(
    record({ bodyHtml: "<table><tr><td>a</td><td>b</td></tr></table>" } as Partial<Problem>),
    record({ bodyHtml: "<table><tr><td>x</td><td>y</td></tr></table>" } as Partial<Problem>),
  );
  assert.equal(flags.length, 2);
  assert.ok(flags.some((f) => f.path === "cell:0" && f.a === "a" && f.b === "x"));
  assert.ok(flags.some((f) => f.path === "cell:1" && f.a === "b" && f.b === "y"));
});

test("a figure declared by only one pass is flagged on assets:count", () => {
  const flags = diffRecords(
    record({
      bodyHtml: "<figure><img src=\"map.png\"/></figure>",
      assets: [{ src: "map.png", alt: "a map" }],
    } as Partial<Problem>),
    record({ bodyHtml: "", assets: [] } as Partial<Problem>),
  );
  const flag = flags.find((f) => f.path === "assets:count");
  assert.ok(flag, "expected an assets:count flag");
  assert.equal(flag?.a, "1");
  assert.equal(flag?.b, "0");
});

test("a <figure> present in only one pass's bodyHtml is flagged on figures:count", () => {
  const flags = diffRecords(
    record({ bodyHtml: "<figure><img src=\"map.png\"/></figure>" } as Partial<Problem>),
    record({ bodyHtml: "<p>no figure here</p>" } as Partial<Problem>),
  );
  const flag = flags.find((f) => f.path === "figures:count");
  assert.ok(flag, "expected a figures:count flag");
  assert.equal(flag?.a, "1");
  assert.equal(flag?.b, "0");
});

test("matching asset counts with different src names do NOT flag on assets", () => {
  const flags = diffRecords(
    record({
      bodyHtml: "<figure><img src=\"2016-open-a-map.png\"/></figure>",
      assets: [{ src: "2016-open-a-map.png", alt: "a map" }],
    } as Partial<Problem>),
    record({
      bodyHtml: "<figure><img src=\"2016-open-A-map.png\"/></figure>",
      assets: [{ src: "2016-open-A-map.png", alt: "a map" }],
    } as Partial<Problem>),
  );
  assert.ok(!flags.some((f) => f.path === "assets:count" || f.path === "figures:count"));
});

test("question ids differing only in case, with identical answer keys, produce no flags", () => {
  const flags = diffRecords(
    record({ questions: [{ id: "D1.Althea-dessert", promptHtml: "p", gradingMode: "exact", answerKey: "cake", acceptedVariants: [], points: 1 }] } as Partial<Problem>),
    record({ questions: [{ id: "D1.althea-dessert", promptHtml: "p", gradingMode: "exact", answerKey: "cake", acceptedVariants: [], points: 1 }] } as Partial<Problem>),
  );
  assert.deepEqual(flags, []);
});

test("question ids differing only in case but with different answer keys still flags the answer-key difference", () => {
  const flags = diffRecords(
    record({ questions: [{ id: "D1.Althea-dessert", promptHtml: "p", gradingMode: "exact", answerKey: "cake", acceptedVariants: [], points: 1 }] } as Partial<Problem>),
    record({ questions: [{ id: "D1.althea-dessert", promptHtml: "p", gradingMode: "exact", answerKey: "pie", acceptedVariants: [], points: 1 }] } as Partial<Problem>),
  );
  assert.equal(flags.length, 1);
  assert.equal(flags[0].path, "q:d1.althea-dessert:key");
  assert.equal(flags[0].a, "cake");
  assert.equal(flags[0].b, "pie");
});

test("agreeing assets and figures counts produce no flags on those keys", () => {
  const flags = diffRecords(
    record({
      bodyHtml: "<figure><img src=\"map-one.png\"/></figure>",
      assets: [{ src: "map-one.png", alt: "a map" }],
    } as Partial<Problem>),
    record({
      bodyHtml: "<figure><img src=\"map-two.png\"/></figure>",
      assets: [{ src: "map-two.png", alt: "a map" }],
    } as Partial<Problem>),
  );
  assert.ok(!flags.some((f) => f.path === "assets:count" || f.path === "figures:count"));
});
