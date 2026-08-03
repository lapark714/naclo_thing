import { test } from "node:test";
import assert from "node:assert/strict";
import { buildArbitrationPrompt, parseArbitrationReply, applyResolutions } from "../../scripts/ingest/arbitrate";
import type { Problem } from "../../content/schema";
import type { Flag } from "../../scripts/ingest/types";

test("the prompt carries both candidates and the excerpt", () => {
  const flag: Flag = { kind: "diff", path: "q:A1.a:key", a: "ɲam", b: "ŋam" };
  const prompt = buildArbitrationPrompt(flag, "... the form ɲam appears ...");
  assert.ok(prompt.includes("ɲam"));
  assert.ok(prompt.includes("ŋam"));
  assert.ok(prompt.includes("the form ɲam appears"));
  assert.ok(prompt.toUpperCase().includes("UNRESOLVED"));
});

test("parseArbitrationReply extracts a chosen value", () => {
  assert.equal(parseArbitrationReply('VALUE: ɲam'), "ɲam");
  assert.equal(parseArbitrationReply('  VALUE:   kecantikan  \n'), "kecantikan");
});

test("parseArbitrationReply returns null when unresolved or malformed", () => {
  assert.equal(parseArbitrationReply("UNRESOLVED"), null);
  assert.equal(parseArbitrationReply("I am not sure about this"), null);
});

function record(): Problem {
  return {
    id: "x", tier: "full", year: 2016, round: "open", letter: "A", title: "T",
    authors: ["X"], sourcePdfUrl: "https://naclo.org/practice.php",
    conceptTags: ["phonology"], formTag: "rule-discovery", difficulty: "intro",
    languages: [], officialPoints: 5, officialTimeMinutes: 10,
    bodyHtml: "", assets: [],
    questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "wrong", acceptedVariants: [], points: 1 }],
    hints: [], explanationHtml: "", reviewStatus: "drafted",
  } as Problem;
}

test("a resolved answer key is written into the record", () => {
  const { record: out, unresolved } = applyResolutions(record(), [{ path: "q:A1.a:key", value: "right" }]);
  assert.equal(out.questions[0].answerKey, "right");
  assert.deepEqual(unresolved, []);
});

test("an unresolved flag is returned rather than applied", () => {
  const { record: out, unresolved } = applyResolutions(record(), [{ path: "q:A1.a:key", value: null }]);
  assert.equal(out.questions[0].answerKey, "wrong");
  assert.equal(unresolved.length, 1);
  assert.equal(unresolved[0].path, "q:A1.a:key");
});

test("a resolution addressing a path that cannot be written back stays unresolved", () => {
  const { unresolved } = applyResolutions(record(), [{ path: "cell:4", value: "x" }]);
  assert.equal(unresolved.length, 1);
});

test("a mode resolution with a valid value writes gradingMode", () => {
  const { record: out, unresolved } = applyResolutions(record(), [{ path: "q:A1.a:mode", value: "llm" }]);
  assert.equal(out.questions[0].gradingMode, "llm");
  assert.deepEqual(unresolved, []);
});

test("a mode resolution with an invalid value does not write and returns unresolved", () => {
  const { record: out, unresolved } = applyResolutions(record(), [{ path: "q:A1.a:mode", value: "maybe" }]);
  assert.equal(out.questions[0].gradingMode, "exact");
  assert.equal(unresolved.length, 1);
  assert.equal(unresolved[0].path, "q:A1.a:mode");
});

test("a points resolution with a numeric string writes the number", () => {
  const { record: out, unresolved } = applyResolutions(record(), [{ path: "q:A1.a:points", value: "3" }]);
  assert.equal(out.questions[0].points, 3);
  assert.deepEqual(unresolved, []);
});

test("a points resolution with a non-numeric value does not write and returns unresolved", () => {
  const { record: out, unresolved } = applyResolutions(record(), [{ path: "q:A1.a:points", value: "five" }]);
  assert.equal(out.questions[0].points, 1);
  assert.equal(unresolved.length, 1);
  assert.equal(unresolved[0].path, "q:A1.a:points");
});

test("a variants resolution writes acceptedVariants as an array and does not touch choices", () => {
  const { record: out, unresolved } = applyResolutions(record(), [{ path: "q:A1.a:variants", value: "var1|var2|var3" }]);
  assert.deepEqual(out.questions[0].acceptedVariants, ["var1", "var2", "var3"]);
  assert.equal(out.questions[0].choices, undefined);
  assert.deepEqual(unresolved, []);
});

test("a choices resolution writes choices and does not touch acceptedVariants", () => {
  const rec = record();
  rec.questions[0].acceptedVariants = ["old"];
  const { record: out, unresolved } = applyResolutions(rec, [{ path: "q:A1.a:choices", value: "opt1|opt2|opt3" }]);
  assert.deepEqual(out.questions[0].choices, ["opt1", "opt2", "opt3"]);
  assert.deepEqual(out.questions[0].acceptedVariants, ["old"]);
  assert.deepEqual(unresolved, []);
});

test("a q: path naming a non-existent question returns unresolved and writes nothing", () => {
  const { record: out, unresolved } = applyResolutions(record(), [{ path: "q:nonexistent:key", value: "something" }]);
  assert.equal(out.questions[0].answerKey, "wrong");
  assert.equal(unresolved.length, 1);
  assert.equal(unresolved[0].path, "q:nonexistent:key");
});
