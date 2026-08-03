import { test } from "node:test";
import assert from "node:assert/strict";
import { stripTags, tableCells, dataSpans, diffRecords } from "../../scripts/ingest/diff";
import type { Problem } from "../../content/schema";

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
  assert.equal(flags[0].path, "q:A1.a:key");
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

test("a question present in only one pass is flagged", () => {
  const flags = diffRecords(record(), record({ questions: [] } as Partial<Problem>));
  assert.ok(flags.some((f) => f.note === "absent in pass B"));
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

test("data span count mismatch produces exactly one flag, skips positional comparison", () => {
  const flags = diffRecords(
    record({ bodyHtml: '<p><span class="data">a</span><span class="data">b</span></p>' } as Partial<Problem>),
    record({ bodyHtml: '<p><span class="data">x</span></p>' } as Partial<Problem>),
  );
  assert.equal(flags.length, 1);
  assert.equal(flags[0].path, "data:count");
  assert.equal(flags[0].a, "2");
  assert.equal(flags[0].b, "1");
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
