/**
 * Stage 7 — decide, write, and report.
 *
 * Park is the default failure mode. A record publishes only when every gate is
 * green; anything else goes to content/parked/, which is committed and is the
 * queue for later human passes. lib/content.ts reads neither drafts nor
 * parked, so a problem the pipeline could not vouch for cannot reach a student
 * however the run went.
 */

import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Problem } from "../../content/schema";
import type { Flag } from "./types";
import {
  allText,
  badAnswerSlots,
  badQuestions,
  coveredRanges,
  markupInTextFields,
  missingAssets,
  offTaxonomyTags,
  uncoveredChars,
  untypeableAnswers,
} from "./validate";

const PUBLISHED_DIR = "content/problems";
const PARKED_DIR = "content/parked";

export type Outcome = {
  id: string;
  status: "published" | "parked";
  flags: Flag[];
  questionCount: number;
};

/**
 * Common English words, skipped as keys entirely, past even the length
 * floor. A key that happens to be an ordinary word like "with" or "very"
 * collides constantly with a hint's ordinary prose — cipher and decoding
 * problems routinely have plain-English answers — and word-boundary
 * matching does not help here, since these appear as themselves, not
 * embedded inside a longer word. The check earns its keep when a hint
 * quotes a distinctive answer a student could not otherwise guess (a
 * foreign-language word, a made-up morpheme); it has no signal when the
 * answer key happens to be an ordinary word a hint legitimately needs to
 * use to talk about the problem at all — a phonology hint cannot avoid
 * saying "vowels". Closed-class function words plus a handful of
 * high-frequency content words that are both plausible answers and
 * plausible hint vocabulary; not tuned to chase the archive's flag count to
 * zero, only to stop the indisputable false positives.
 */
const STOPWORD_KEYS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from",
  "has", "have", "he", "her", "his", "in", "is", "it", "its", "not", "of",
  "on", "one", "or", "she", "so", "than", "that", "the", "their", "them",
  "then", "there", "these", "they", "this", "to", "two", "up", "very",
  "was", "were", "what", "when", "which", "who", "will", "with", "you",
  "your",
  "vowels", "vowel", "consonants", "consonant", "same", "different",
  "first", "second", "third", "last", "next", "none", "all", "both",
  "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "yes", "no", "true", "false", "plural", "singular", "past", "present",
  "future", "subject", "object", "verb", "noun", "word", "words",
  "letter", "letters", "sound", "sounds", "number", "numbers",
]);

/**
 * True when `key` consists only of digits, optionally with a decimal point
 * or a leading minus sign — "100", "3.5", "-2". A hint about a counting or
 * number-system problem cannot discuss the number range without naming
 * numbers, and a bare numeral carries no distinctive information the way a
 * foreign word or invented morpheme does.
 */
function isNumericKey(key: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(key);
}

/** Escapes a string for literal use inside a RegExp. */
function escapeForRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True when `key` occurs in `text` as a standalone word or phrase, not
 * embedded inside a longer one — "very" must not fire on "every". Plain \b
 * is ASCII-only: it only sees a boundary where one side is [A-Za-z0-9_], so
 * it silently fails at the edge of a non-ASCII key (an IPA letter, or the
 * first character of a key like "ɲam", is not \b's idea of a word
 * character). The boundary is built from Unicode letter/number classes
 * instead so a non-Latin or accented key still gets real edges, not none.
 */
function containsAsWord(text: string, key: string): boolean {
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeForRegExp(key)}(?![\\p{L}\\p{N}])`, "u");
  return pattern.test(text);
}

/**
 * Hints are generated once, not cross-checked, because two passes never word
 * prose the same way. The constraint that replaces consensus for them is that
 * a hint must not simply hand over a graded answer. Keys shorter than three
 * characters are skipped ("a" appears in every sentence in English), keys
 * that are themselves common words are skipped outright (STOPWORD_KEYS
 * above), and purely numeric keys are skipped (isNumericKey above).
 */
export function hintsLeakAnswers(record: Problem): Flag[] {
  const flags: Flag[] = [];
  const keys = record.questions
    .filter((q) => q.gradingMode === "exact")
    .map((q) => q.answerKey.trim().toLowerCase())
    .filter((k) => k.length >= 3 && !STOPWORD_KEYS.has(k) && !isNumericKey(k));

  record.hints.forEach((hint, i) => {
    const text = hint.text.toLowerCase();
    for (const key of keys) {
      if (containsAsWord(text, key)) {
        flags.push({
          kind: "diff",
          path: `hints[${i}]`,
          a: key,
          note: `hint ${i + 1} contains the graded answer "${key}"`,
        });
        return;
      }
    }
  });
  return flags;
}

/**
 * Everything validate.ts (the build gate) checks beyond the Zod schema,
 * reduced to Flags so decide() can park on the same rules that would
 * otherwise fail `npm run build` after the fact. A record this returns no
 * flags for is a record `npm run validate` will also accept.
 *
 * Takes the payload as it will actually be written — the caller passes the
 * schema-parsed, "published"-stamped record, not the raw draft — so an
 * internal-only field like `_reviewNotes` (present on the raw record, always
 * stripped by the Zod parse before writeRecord ever writes a published file)
 * can never trip a check meant for the shipped file. See publishedPayload's
 * doc comment below for why the parse strips it.
 */
function buildGateFlags(problem: Problem): Flag[] {
  const flags: Flag[] = [];

  const uncovered = uncoveredChars(allText(problem), coveredRanges());
  if (uncovered.size > 0) {
    const list = [...uncovered.entries()]
      .slice(0, 8)
      .map(([ch, cp]) => `"${ch}" U+${cp.toString(16).toUpperCase().padStart(4, "0")}`)
      .join(", ");
    flags.push({
      kind: "diff",
      path: "(glyph coverage)",
      note:
        `characters with no font coverage — ${list}${uncovered.size > 8 ? ` (+${uncovered.size - 8} more)` : ""}. ` +
        `Add a subset in app/globals.css before this can ship.`,
    });
  }

  for (const issue of offTaxonomyTags(problem)) {
    flags.push({ kind: "diff", path: "(taxonomy)", note: issue });
  }

  for (const issue of badAnswerSlots(problem)) {
    flags.push({ kind: "diff", path: "(answer slots)", note: issue });
  }

  for (const issue of untypeableAnswers(problem)) {
    flags.push({
      kind: "diff",
      path: "(typeable)",
      note: `${issue} cannot be typed on a US keyboard, and no acceptedVariant can either`,
    });
  }

  for (const field of markupInTextFields(problem)) {
    flags.push({
      kind: "diff",
      path: field,
      note: `${field} contains markup, but the site renders that field as plain text`,
    });
  }

  for (const issue of badQuestions(problem)) {
    flags.push({ kind: "diff", path: "(questions)", note: issue });
  }

  for (const issue of missingAssets(problem)) {
    flags.push({ kind: "diff", path: "(assets)", note: issue });
  }

  return flags;
}

export function decide(record: Problem, flags: Flag[]): Outcome {
  const all = [...flags, ...hintsLeakAnswers(record)];

  // The schema is a gate too: a record that cannot parse is not publishable
  // whatever the cross-checks said.
  const parsed = Problem.safeParse({ ...record, reviewStatus: "published" });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      all.push({
        kind: "diff",
        path: issue.path.join(".") || "(root)",
        note: `schema: ${issue.message}`,
      });
    }
  } else {
    // Run the build gate's rules against the payload that would actually be
    // written, so a record decide() calls "published" can never fail
    // `npm run build`.
    all.push(...buildGateFlags(parsed.data));
  }

  return {
    id: record.id,
    status: all.length === 0 ? "published" : "parked",
    flags: all,
    questionCount: record.questions.length,
  };
}

/**
 * The published payload is the record re-parsed through the schema, not the
 * raw record spread. `loadDraft` deliberately carries `_reviewNotes` back
 * across the parse (Stage 5 needs it to crop figures), so the raw record
 * that reaches here still has it attached — and a raw spread would ship that
 * internal note straight into a published JSON file, where validate.ts's
 * glyph check treats one stray symbol in it as a build-blocking problem.
 * `Problem.safeParse` strips any key the schema does not declare, same as it
 * would for any other unknown field, so re-parsing is what actually keeps
 * `_reviewNotes` off the wire. `decide()` only ever marks an outcome
 * "published" after this exact parse (with the same reviewStatus override)
 * already succeeded once, so failure here means that invariant broke.
 */
function publishedPayload(record: Problem): Problem {
  const parsed = Problem.safeParse({ ...record, reviewStatus: "published" as const });
  if (!parsed.success) {
    throw new Error(
      `writeRecord: record ${record.id} was marked published but failed to re-parse: ` +
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  return parsed.data;
}

export function writeRecord(
  o: Outcome,
  record: Problem,
  dirs: { published: string; parked: string } = { published: PUBLISHED_DIR, parked: PARKED_DIR },
): string {
  const dir = o.status === "published" ? dirs.published : dirs.parked;
  const counterpartDir = o.status === "published" ? dirs.parked : dirs.published;
  mkdirSync(dir, { recursive: true });

  // Parked records keep _reviewNotes and _parkReasons — that pairing IS the
  // human review queue's content, not an internal leak, because parked
  // files never ship to a student.
  const payload =
    o.status === "published"
      ? publishedPayload(record)
      : { ...record, reviewStatus: "drafted" as const, _parkReasons: o.flags };

  const path = join(dir, `${record.id}.json`);
  writeFileSync(path, JSON.stringify(payload, null, 2) + "\n");

  // A record that published on one run and parks on the next (or the other
  // way around — arbitration is a non-deterministic model call, cropFigures
  // hits the network) must not leave its previous outcome live under the
  // other directory. lib/content.ts reads only content/problems/, so a stale
  // published file left behind after a record parks would keep serving that
  // record to students even though this run's report says it parked.
  const counterpartPath = join(counterpartDir, `${record.id}.json`);
  if (existsSync(counterpartPath)) {
    try {
      unlinkSync(counterpartPath);
    } catch {
      // Best-effort: a failed cleanup should not stop this run from
      // reporting the record it DID successfully write.
    }
  }

  return path;
}

export function renderReport(outcomes: Outcome[], dateIso: string): string {
  const published = outcomes.filter((o) => o.status === "published");
  const parked = outcomes.filter((o) => o.status === "parked");
  const questions = published.reduce((n, o) => n + o.questionCount, 0);

  const lines: string[] = [
    `# Ingest run ${dateIso}`,
    ``,
    `${outcomes.length} attempted, ${published.length} published, ${parked.length} parked.`,
    `${questions} sub-questions added.`,
    ``,
  ];

  if (published.length > 0) {
    lines.push(`## Published`, ``);
    for (const o of published) lines.push(`- ${o.id} (${o.questionCount} questions)`);
    lines.push(``);
  }

  if (parked.length > 0) {
    lines.push(`## Parked`, ``);
    for (const o of parked) {
      lines.push(`### ${o.id}`, ``);
      for (const f of o.flags.slice(0, 25)) {
        const candidates =
          f.a !== undefined || f.b !== undefined
            ? ` A=${JSON.stringify(f.a ?? null)} B=${JSON.stringify(f.b ?? null)}`
            : "";
        lines.push(`- \`${f.kind}\` ${f.path}${candidates}${f.note ? ` — ${f.note}` : ""}`);
      }
      if (o.flags.length > 25) lines.push(`- ...and ${o.flags.length - 25} more`);
      lines.push(``);
    }
  }
  return lines.join("\n");
}
