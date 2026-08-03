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
 * Hints are generated once, not cross-checked, because two passes never word
 * prose the same way. The constraint that replaces consensus for them is that
 * a hint must not simply hand over a graded answer. Keys shorter than three
 * characters are skipped: "a" appears in every sentence in English.
 */
export function hintsLeakAnswers(record: Problem): Flag[] {
  const flags: Flag[] = [];
  const keys = record.questions
    .filter((q) => q.gradingMode === "exact")
    .map((q) => q.answerKey.trim().toLowerCase())
    .filter((k) => k.length >= 3);

  record.hints.forEach((hint, i) => {
    const text = hint.text.toLowerCase();
    for (const key of keys) {
      if (text.includes(key)) {
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
