import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decide, renderReport, hintsLeakAnswers, writeRecord } from "../../scripts/ingest/publish";
import type { Problem } from "../../content/schema";
import type { Flag } from "../../scripts/ingest/types";

function record(over: Partial<Problem> = {}): Problem {
  return {
    id: "2016-open-A", tier: "full", year: 2016, round: "open", letter: "A",
    title: "T", authors: ["X"], sourcePdfUrl: "https://naclo.org/practice.php",
    conceptTags: ["morphology"], formTag: "rosetta-stone translation", difficulty: "intro",
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

// --- build gate parity ----------------------------------------------------
//
// decide() is the publish gate; validate.ts is the build gate. A record
// decide() calls "published" must never be a record `npm run validate`
// rejects, or the pipeline reports success while the build refuses to ship
// (2021-open-A: markup inside two hint texts published, then failed the
// build for all 42 published records at once).

test("a record with markup in a hint's text does not publish, and the flag names the field", () => {
  const withMarkup = record({
    hints: [
      { tier: 1, text: "one", xpCost: 1 },
      { tier: 2, text: 'Look at the <span class="data">root</span>.', xpCost: 2 },
      { tier: 3, text: "three", xpCost: 3 },
    ],
  } as Partial<Problem>);
  const o = decide(withMarkup, []);
  assert.equal(o.status, "parked");
  assert.ok(
    o.flags.some((f) => f.path === "hints[1].text"),
    "the flag should name the offending field",
  );
});

test("a record with an off-taxonomy concept tag does not publish", () => {
  const offTaxonomy = record({ conceptTags: ["not-a-real-concept"] } as Partial<Problem>);
  const o = decide(offTaxonomy, []);
  assert.equal(o.status, "parked");
  assert.ok(o.flags.some((f) => f.note?.includes("not-a-real-concept")));
});

test("a record with an answer slot naming no question does not publish", () => {
  const badSlot = record({
    bodyHtml: '<p>Fill in <span class="blank" data-q="Z9.z"></span>.</p>',
  } as Partial<Problem>);
  const o = decide(badSlot, []);
  assert.equal(o.status, "parked");
  assert.ok(o.flags.some((f) => f.note?.includes('data-q="Z9.z"')));
});

test("a record that passes every build-gate check still publishes (guard against over-blocking)", () => {
  // Genuinely clean: real taxonomy values (content/taxonomy.ts), no markup
  // in a text field, no answer slots, an ASCII-typeable exact answer, a
  // non-empty answer key, and no referenced assets to go missing.
  const clean = record();
  const o = decide(clean, []);
  assert.equal(o.status, "published");
  assert.deepEqual(o.flags, []);
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

test("a purely numeric key does not flag even when present as a standalone word", () => {
  // A hint about perfect squares cannot list the range without naming a
  // hundred — 2016-open-E, where the hint reads "the perfect squares
  // between 1 and 100 are 1, 4, 9, 16, 25, 36, 49, 64, 81 and 100".
  const r = record({
    questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "100", acceptedVariants: [], points: 1 }],
    hints: [
      { tier: 1, text: "Think about perfect squares.", xpCost: 1 },
      { tier: 2, text: "Keep going.", xpCost: 2 },
      { tier: 3, text: "The perfect squares between 1 and 100 are 1, 4, 9, 16, 25, 36, 49, 64, 81 and 100.", xpCost: 3 },
    ],
  } as Partial<Problem>);
  assert.deepEqual(hintsLeakAnswers(r), []);
});

test("a content-word key on the extended stopword list does not flag", () => {
  // A phonology hint cannot avoid the word "vowels" — 2020-open-A.
  const r = record({
    questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "vowels", acceptedVariants: [], points: 1 }],
    hints: [
      { tier: 1, text: "Look at the vowels in each row.", xpCost: 1 },
      { tier: 2, text: "Keep going.", xpCost: 2 },
      { tier: 3, text: "Nearly there.", xpCost: 3 },
    ],
  } as Partial<Problem>);
  assert.deepEqual(hintsLeakAnswers(r), []);
});

test("a distinctive non-English key still flags after the stopword/numeric extension", () => {
  // The guard against over-correcting: an ordinary numeral or content word
  // is skipped, but a genuinely distinctive answer a student could not
  // otherwise guess must still be caught.
  const r = record({
    questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "asado", acceptedVariants: [], points: 1 }],
    hints: [
      { tier: 1, text: "Compare rows two and five.", xpCost: 1 },
      { tier: 2, text: "Look at the root.", xpCost: 2 },
      { tier: 3, text: "The sentence uses the word asado to describe the dish.", xpCost: 3 },
    ],
  } as Partial<Problem>);
  const flags = hintsLeakAnswers(r);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].a, "asado");
});

// --- writeRecord ---------------------------------------------------------
//
// These exercise real filesystem writes, so every one of them uses a scratch
// directory under the OS tmp dir via the `dirs` override — never
// content/problems or content/parked. That override exists for exactly this
// (see Finding 2/6 in the final review): production call sites in run.ts
// omit it and get the real directories.

function withScratchDirs(fn: (dirs: { published: string; parked: string }) => void) {
  const root = mkdtempSync(join(tmpdir(), "publish-test-"));
  const dirs = { published: join(root, "problems"), parked: join(root, "parked") };
  try {
    fn(dirs);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("writeRecord strips _reviewNotes from a published record (Finding 6)", () => {
  withScratchDirs((dirs) => {
    const rec = { ...record(), _reviewNotes: "CROP /content-assets/x.png page=1 x=1 y=1 w=1 h=1" } as Problem;
    const outcome = decide(rec, []);
    assert.equal(outcome.status, "published");

    const path = writeRecord(outcome, rec, dirs);
    const written = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(written.reviewStatus, "published");
    assert.equal("_reviewNotes" in written, false, "_reviewNotes must not reach a published file");
  });
});

test("writeRecord keeps _reviewNotes and adds _parkReasons on a parked record", () => {
  withScratchDirs((dirs) => {
    const rec = { ...record(), _reviewNotes: "keys checked against the solution" } as Problem;
    const flags: Flag[] = [{ kind: "diff", path: "q:A1.a:key", a: "x", b: "y" }];
    const outcome = decide(rec, flags);
    assert.equal(outcome.status, "parked");

    const path = writeRecord(outcome, rec, dirs);
    const written = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(written.reviewStatus, "drafted");
    assert.equal(written._reviewNotes, "keys checked against the solution");
    assert.ok(Array.isArray(written._parkReasons) && written._parkReasons.length === 1);
  });
});

test("writeRecord deletes a stale published file when the record parks this run (Finding 2)", () => {
  withScratchDirs((dirs) => {
    mkdirSync(dirs.published, { recursive: true });
    const stalePath = join(dirs.published, `${record().id}.json`);
    writeFileSync(stalePath, JSON.stringify({ ...record(), reviewStatus: "published" }));

    const rec = record();
    const flags: Flag[] = [{ kind: "diff", path: "q:A1.a:key", a: "x", b: "y" }];
    const outcome = decide(rec, flags);
    assert.equal(outcome.status, "parked");
    writeRecord(outcome, rec, dirs);

    assert.equal(existsSync(stalePath), false, "the stale published file must be removed once the record parks");
    assert.ok(existsSync(join(dirs.parked, `${record().id}.json`)));
  });
});

test("writeRecord deletes a stale parked file when the record publishes this run (Finding 2)", () => {
  withScratchDirs((dirs) => {
    mkdirSync(dirs.parked, { recursive: true });
    const stalePath = join(dirs.parked, `${record().id}.json`);
    writeFileSync(stalePath, JSON.stringify({ ...record(), reviewStatus: "drafted", _parkReasons: [] }));

    const rec = record();
    const outcome = decide(rec, []);
    assert.equal(outcome.status, "published");
    writeRecord(outcome, rec, dirs);

    assert.equal(existsSync(stalePath), false, "the stale parked file must be removed once the record publishes");
    assert.ok(existsSync(join(dirs.published, `${record().id}.json`)));
  });
});

test("writeRecord does not touch the counterpart directory when there is nothing there to clean up", () => {
  withScratchDirs((dirs) => {
    const rec = record();
    const outcome = decide(rec, []);
    // Should not throw even though dirs.parked does not exist yet.
    assert.doesNotThrow(() => writeRecord(outcome, rec, dirs));
    assert.equal(existsSync(dirs.parked), false);
  });
});

// --- catalogue stub protection --------------------------------------------
//
// The regression: writeRecord deleted a record's counterpart whenever one
// existed, without checking whether that counterpart was a stale full
// publish or a tier: "catalogue" stub — metadata-only archive entries for
// problems catalogued long before they were transcribed. A full run deleted
// 27 of them across 2018 and 2020-2022 and the archive quietly shrank from
// 64 published records to 41. Parking a record must delete a stale tier:
// "full" counterpart but never a tier: "catalogue" one, and must default to
// leaving the file alone whenever its tier cannot be determined at all.

test("parking a record whose published counterpart is tier: catalogue leaves that file in place", () => {
  withScratchDirs((dirs) => {
    mkdirSync(dirs.published, { recursive: true });
    const stubPath = join(dirs.published, `${record().id}.json`);
    const stub = { ...record(), tier: "catalogue" as const, questions: [] };
    writeFileSync(stubPath, JSON.stringify(stub));

    const rec = record();
    const flags: Flag[] = [{ kind: "diff", path: "q:A1.a:key", a: "x", b: "y" }];
    const outcome = decide(rec, flags);
    assert.equal(outcome.status, "parked");
    writeRecord(outcome, rec, dirs);

    assert.equal(
      existsSync(stubPath),
      true,
      "a catalogue stub is the archive's own entry, not a stale publish, and parking must not delete it",
    );
    assert.ok(existsSync(join(dirs.parked, `${record().id}.json`)));
  });
});

test("parking a record whose published counterpart is tier: full deletes it", () => {
  withScratchDirs((dirs) => {
    mkdirSync(dirs.published, { recursive: true });
    const stalePath = join(dirs.published, `${record().id}.json`);
    writeFileSync(stalePath, JSON.stringify({ ...record(), reviewStatus: "published" }));

    const rec = record();
    const flags: Flag[] = [{ kind: "diff", path: "q:A1.a:key", a: "x", b: "y" }];
    const outcome = decide(rec, flags);
    assert.equal(outcome.status, "parked");
    writeRecord(outcome, rec, dirs);

    assert.equal(existsSync(stalePath), false, "a stale tier: full publish must be removed once the record parks");
    assert.ok(existsSync(join(dirs.parked, `${record().id}.json`)));
  });
});

test("publishing a record still deletes a stale parked counterpart", () => {
  withScratchDirs((dirs) => {
    mkdirSync(dirs.parked, { recursive: true });
    const stalePath = join(dirs.parked, `${record().id}.json`);
    writeFileSync(stalePath, JSON.stringify({ ...record(), reviewStatus: "drafted", _parkReasons: [] }));

    const rec = record();
    const outcome = decide(rec, []);
    assert.equal(outcome.status, "published");
    writeRecord(outcome, rec, dirs);

    assert.equal(
      existsSync(stalePath),
      false,
      "content/parked/ never holds a catalogue stub to protect, so the publish direction is unchanged",
    );
    assert.ok(existsSync(join(dirs.published, `${record().id}.json`)));
  });
});

test("a counterpart file containing malformed JSON is left in place rather than deleted", () => {
  withScratchDirs((dirs) => {
    mkdirSync(dirs.published, { recursive: true });
    const malformedPath = join(dirs.published, `${record().id}.json`);
    writeFileSync(malformedPath, "{ this is not valid JSON");

    const rec = record();
    const flags: Flag[] = [{ kind: "diff", path: "q:A1.a:key", a: "x", b: "y" }];
    const outcome = decide(rec, flags);
    assert.equal(outcome.status, "parked");
    assert.doesNotThrow(() => writeRecord(outcome, rec, dirs));

    assert.equal(
      existsSync(malformedPath),
      true,
      "an unreadable tier is not evidence of a stale publish — deleting on doubt is how the archive shrank",
    );
  });
});
