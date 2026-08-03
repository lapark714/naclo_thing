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

test("a resolved answer key matching candidate A is written into the record", () => {
  const { record: out, unresolved } = applyResolutions(record(), [
    { path: "q:A1.a:key", value: "right", a: "right", b: "rong" },
  ]);
  assert.equal(out.questions[0].answerKey, "right");
  assert.deepEqual(unresolved, []);
});

test("a resolved answer key matching candidate B is written into the record", () => {
  const { record: out, unresolved } = applyResolutions(record(), [
    { path: "q:A1.a:key", value: "right", a: "rong", b: "right" },
  ]);
  assert.equal(out.questions[0].answerKey, "right");
  assert.deepEqual(unresolved, []);
});

test("a resolved answer key matching a candidate only after trimming whitespace is still accepted", () => {
  const { record: out, unresolved } = applyResolutions(record(), [
    { path: "q:A1.a:key", value: "right", a: "  right  ", b: "rong" },
  ]);
  assert.equal(out.questions[0].answerKey, "right");
  assert.deepEqual(unresolved, []);
});

// Finding 5 (Important): applyResolutions used to write ANY arbitrated value
// straight onto answerKey with no check. arbitrate() is handed only the
// problem pages (never the solution), so nothing stopped it from inventing a
// key that neither transcription pass ever proposed, other than the
// prompt's own UNRESOLVED bias — a soft, non-enforced guardrail for the
// highest-consequence field in the record.
test("an answer-key value that matches neither candidate is treated as unresolved, not written", () => {
  const { record: out, unresolved } = applyResolutions(record(), [
    { path: "q:A1.a:key", value: "invented", a: "candidateA", b: "candidateB" },
  ]);
  assert.equal(out.questions[0].answerKey, "wrong", "the invented value must not reach answerKey");
  assert.equal(unresolved.length, 1);
  assert.equal(unresolved[0].path, "q:A1.a:key");
  assert.match(unresolved[0].note ?? "", /neither candidate/);
});

test("an answer-key value with no candidates recorded on the flag is treated as unresolved", () => {
  // A resolution built without threading the flag's a/b through (or from a
  // flag that itself carried no candidates) must fail closed, not open.
  const { record: out, unresolved } = applyResolutions(record(), [{ path: "q:A1.a:key", value: "right" }]);
  assert.equal(out.questions[0].answerKey, "wrong");
  assert.equal(unresolved.length, 1);
});

test("a mode/points/variants/choices resolution is unaffected by the answer-key candidate check", () => {
  // The guard is scoped to :key paths only — a mode resolution with no
  // candidates on the flag must still apply normally.
  const { record: out, unresolved } = applyResolutions(record(), [{ path: "q:A1.a:mode", value: "llm" }]);
  assert.equal(out.questions[0].gradingMode, "llm");
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

test("a path whose id case differs from the record's stored id still finds the question and writes the value", () => {
  const rec = record();
  rec.questions[0].id = "D1.Althea-dessert";
  const { record: out, unresolved } = applyResolutions(rec, [
    { path: "q:d1.althea-dessert:key", value: "right", a: "right", b: "rong" },
  ]);
  assert.equal(out.questions[0].id, "D1.Althea-dessert");
  assert.equal(out.questions[0].answerKey, "right");
  assert.deepEqual(unresolved, []);
});

test("a q: path naming a non-existent question returns unresolved and writes nothing", () => {
  const { record: out, unresolved } = applyResolutions(record(), [{ path: "q:nonexistent:key", value: "something" }]);
  assert.equal(out.questions[0].answerKey, "wrong");
  assert.equal(unresolved.length, 1);
  assert.equal(unresolved[0].path, "q:nonexistent:key");
});
