import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeForWitness, checkWitness } from "../../scripts/ingest/witness";
import type { Problem } from "../../content/schema";

function withBody(bodyHtml: string): Problem {
  return {
    id: "x", tier: "full", year: 2016, round: "open", letter: "A", title: "T",
    authors: ["X"], sourcePdfUrl: "https://naclo.org/practice.php",
    conceptTags: ["phonology"], formTag: "rule-discovery", difficulty: "intro",
    languages: [], officialPoints: 5, officialTimeMinutes: 10,
    bodyHtml, assets: [], questions: [], hints: [], explanationHtml: "",
    reviewStatus: "drafted",
  } as Problem;
}

test("normalizeForWitness collapses whitespace and composes marks", () => {
  assert.equal(normalizeForWitness("há  ere"), "háere".normalize("NFC"));
});

test("data present in the text layer produces no flag", () => {
  const p = withBody('<p><span class="data">hąąhere</span></p>');
  assert.deepEqual(checkWitness(p, "the word hąąhere means fish"), []);
});

test("a substituted consonant is caught", () => {
  const p = withBody('<table><tr><td><span class="data">ŋam</span></td></tr></table>');
  const flags = checkWitness(p, "the form ɲam appears here");
  assert.equal(flags.length, 1);
  assert.equal(flags[0].kind, "witness");
  assert.equal(flags[0].a, "ŋam");
});

test("dropped characters are caught", () => {
  const p = withBody('<dl><dt>olohelohealun</dt><dd>gloss</dd></dl>');
  const flags = checkWitness(p, "oloheloheamalun is the string");
  assert.ok(flags.some((f) => f.a === "olohelohealun"));
});

test("single characters are skipped, being too common to be evidence", () => {
  const p = withBody('<dl><dt>a</dt><dd>b</dd></dl>');
  assert.deepEqual(checkWitness(p, "nothing relevant"), []);
});

test("line breaks in the text layer do not cause false flags", () => {
  const p = withBody('<p><span class="data">banka balülü</span></p>');
  assert.deepEqual(checkWitness(p, "banka\nbalülü bamwi"), []);
});