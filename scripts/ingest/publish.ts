/**
 * Stage 7 — decide, write, and report.
 *
 * Park is the default failure mode. A record publishes only when every gate is
 * green; anything else goes to content/parked/, which is committed and is the
 * queue for later human passes. lib/content.ts reads neither drafts nor
 * parked, so a problem the pipeline could not vouch for cannot reach a student
 * however the run went.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Problem } from "../../content/schema";
import type { Flag } from "./types";

const PUBLISHED_DIR = "content/problems";
const PARKED_DIR = "content/parked";

export type Outcome = {
  id: string;
  status: "published" | "parked";
  flags: Flag[];
  questionCount: number;
};

/**
 * Common English function words, skipped as keys entirely, past even the
 * length floor. A key that happens to be an ordinary word like "with" or
 * "very" collides constantly with a hint's ordinary prose — cipher and
 * decoding problems routinely have plain-English answers — and word-boundary
 * matching does not help here, since these appear as themselves, not
 * embedded inside a longer word. Closed-class function words plus a handful
 * of high-frequency fillers; not tuned to chase the archive's flag count to
 * zero, only to stop the indisputable false positives.
 */
const STOPWORD_KEYS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from",
  "has", "have", "he", "her", "his", "in", "is", "it", "its", "not", "of",
  "on", "one", "or", "she", "so", "than", "that", "the", "their", "them",
  "then", "there", "these", "they", "this", "to", "two", "up", "very",
  "was", "were", "what", "when", "which", "who", "will", "with", "you",
  "your",
]);

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
 * characters are skipped ("a" appears in every sentence in English), and
 * keys that are themselves common function words are skipped outright
 * (STOPWORD_KEYS above).
 */
export function hintsLeakAnswers(record: Problem): Flag[] {
  const flags: Flag[] = [];
  const keys = record.questions
    .filter((q) => q.gradingMode === "exact")
    .map((q) => q.answerKey.trim().toLowerCase())
    .filter((k) => k.length >= 3 && !STOPWORD_KEYS.has(k));

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
  }

  return {
    id: record.id,
    status: all.length === 0 ? "published" : "parked",
    flags: all,
    questionCount: record.questions.length,
  };
}

export function writeRecord(o: Outcome, record: Problem): string {
  const dir = o.status === "published" ? PUBLISHED_DIR : PARKED_DIR;
  mkdirSync(dir, { recursive: true });

  const payload =
    o.status === "published"
      ? { ...record, reviewStatus: "published" as const }
      : { ...record, reviewStatus: "drafted" as const, _parkReasons: o.flags };

  const path = join(dir, `${record.id}.json`);
  writeFileSync(path, JSON.stringify(payload, null, 2) + "\n");
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
