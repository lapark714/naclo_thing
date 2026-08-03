/**
 * Validates every content record before it can ship.
 *
 * Run by hand (`npm run validate`) and in CI. A non-zero exit blocks the build,
 * which is what keeps unreviewed or malformed records away from students.
 *
 * Checks:
 *   - every record parses against the Zod Problem schema
 *   - every asset referenced by a record exists on disk
 *   - every sub-question has a non-empty answer key
 *   - a question with choices has its key among those choices
 *   - every character in every record is covered by a self-hosted font.
 *     The allowed ranges are parsed from app/globals.css, so the fonts stay
 *     the single source of truth: ship a script with no coverage and the
 *     build fails instead of rendering tofu boxes for students.
 *   - fields that the site renders as plain text carry no markup. Only the
 *     *Html fields are ever passed through dangerouslySetInnerHTML; a <span>
 *     in a hint reaches the student as literal angle brackets.
 *   - concept and form tags come from content/taxonomy.ts, so the filter never
 *     grows an option that belongs to a different axis.
 *   - every typed answer has at least one accepted spelling a student can
 *     actually enter. Grading forgives accents but not distinct letters, so a
 *     key of "þu" with no plain-letter variant is unanswerable by design.
 *
 * Records in content/drafts/ (AI output awaiting review) are checked too, but
 * their failures are warnings — the gate is at publish, not at draft.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Problem } from "../../content/schema";
import { CONCEPT_TAGS, FORM_TAGS } from "../../content/taxonomy";

const PROBLEMS_DIR = process.env.CONTENT_DIR ?? "content/problems";
const DRAFTS_DIR = "content/drafts";
const ASSETS_PREFIX = "/content-assets/";
const ASSETS_DIR = "content/assets";
const CSS_FILE = "app/globals.css";

/* ---------------------------------------------------------------------------
   Glyph coverage
   --------------------------------------------------------------------------- */

type Range = [number, number];

function coveredRanges(): Range[] {
  const css = readFileSync(CSS_FILE, "utf8");
  const ranges: Range[] = [
    [0x09, 0x0a], // tab, newline
    [0x0d, 0x0d],
  ];
  for (const m of css.matchAll(/unicode-range:\s*([^;]+);/g)) {
    for (const part of m[1].split(",")) {
      const token = part.trim().toUpperCase();
      let hit = token.match(/^U\+([0-9A-F]+)-([0-9A-F]+)$/);
      if (hit) {
        ranges.push([parseInt(hit[1], 16), parseInt(hit[2], 16)]);
        continue;
      }
      hit = token.match(/^U\+([0-9A-F?]+)$/);
      if (hit) {
        if (hit[1].includes("?")) {
          const lo = parseInt(hit[1].replaceAll("?", "0"), 16);
          const hi = parseInt(hit[1].replaceAll("?", "F"), 16);
          ranges.push([lo, hi]);
        } else {
          const cp = parseInt(hit[1], 16);
          ranges.push([cp, cp]);
        }
      }
    }
  }
  return ranges;
}

function uncoveredChars(text: string, ranges: Range[]): Map<string, number> {
  const bad = new Map<string, number>();
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (!ranges.some(([lo, hi]) => cp >= lo && cp <= hi)) {
      bad.set(ch, cp);
    }
  }
  return bad;
}

/** Every human-visible string in a record, flattened. */
function allText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(allText).join("");
  if (value && typeof value === "object") {
    return Object.values(value).map(allText).join("");
  }
  return "";
}

/* ---------------------------------------------------------------------------
   Plain-text fields

   The site renders bodyHtml, promptHtml and explanationHtml as HTML, and
   everything else as text. Markup that lands in a text field is shown to the
   student verbatim — "<span class=\"data\">marlu</span>" instead of "marlu".
   The naming convention (*Html or not) is the contract; this enforces it.
   --------------------------------------------------------------------------- */

const MARKUP = /<[a-zA-Z/][^>]*>|&(?:[a-zA-Z]+|#\d+);/;

/** Anything outside plain ASCII: what a US keyboard cannot produce. */
const NON_ASCII = /[^\u0000-\u007F]/;

function markupInTextFields(problem: Problem): string[] {
  const bad: string[] = [];
  problem.hints.forEach((h, i) => {
    if (MARKUP.test(h.text)) bad.push(`hints[${i}].text`);
  });
  for (const q of problem.questions) {
    if (q.partPrompt && MARKUP.test(q.partPrompt)) bad.push(`question ${q.id} partPrompt`);
    if (q.rubric && MARKUP.test(q.rubric)) bad.push(`question ${q.id} rubric`);
    if (MARKUP.test(q.answerKey)) bad.push(`question ${q.id} answerKey`);
    q.choices?.forEach((c, i) => {
      if (MARKUP.test(c)) bad.push(`question ${q.id} choices[${i}]`);
    });
  }
  return bad;
}

/* ---------------------------------------------------------------------------
   Typeable answers

   Grading strips combining marks, so an acute or a macron costs a student
   nothing. It does not touch distinct letters: þ, ŋ, ɨ, ɛ, ɾ survive
   normalization, and none of them are on the keyboard a 14-year-old is using.
   Every typed answer therefore needs at least one accepted form a student can
   actually produce, or the question is unanswerable however well they solved
   it. Questions with `choices` are exempt: those are picked, never typed.
   --------------------------------------------------------------------------- */

/** Mirrors normalize() in lib/grading.ts closely enough for this check. */
function strippable(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’ʼʻ`´]/g, "'")
    .replace(/[‐-―−]/g, "-");
}

/* ---------------------------------------------------------------------------
   Taxonomy

   The schema types these as plain strings, which is how a form tag once ended
   up in a record's concept list, where it showed up as a filter nobody could
   use. The vocabulary is small on purpose; a filter with forty options filters
   nothing.
   --------------------------------------------------------------------------- */

function offTaxonomyTags(problem: Problem): string[] {
  const bad: string[] = [];
  for (const tag of problem.conceptTags) {
    if (!(CONCEPT_TAGS as readonly string[]).includes(tag)) {
      bad.push(`conceptTags has "${tag}", which is not in CONCEPT_TAGS`);
    }
  }
  if (!(FORM_TAGS as readonly string[]).includes(problem.formTag)) {
    bad.push(`formTag "${problem.formTag}" is not in FORM_TAGS`);
  }
  return bad;
}

/* ---------------------------------------------------------------------------
   Answer slots

   A body may mark where the booklet prints a blank with
   `<span class="blank" data-q="F1.a"></span>`, and the interface renders that
   question's input there instead of in the list below. A slot naming a
   question that does not exist would render nothing at all — a blank a student
   can never fill — and a question slotted twice would give it two boxes whose
   state disagrees. Both are silent in the browser, so they are caught here.
   --------------------------------------------------------------------------- */

function badAnswerSlots(problem: Problem): string[] {
  const bad: string[] = [];
  const known = new Set(problem.questions.map((q) => q.id));
  const seen = new Set<string>();

  for (const m of problem.bodyHtml.matchAll(/data-q="([^"]*)"/g)) {
    const id = m[1];
    if (!known.has(id)) bad.push(`answer slot data-q="${id}" names no question`);
    else if (seen.has(id)) bad.push(`question ${id} has more than one answer slot`);
    seen.add(id);
  }
  return bad;
}

function untypeableAnswers(problem: Problem): string[] {
  const bad: string[] = [];
  for (const q of problem.questions) {
    if (q.gradingMode !== "exact" || q.choices) continue;
    const forms = [q.answerKey, ...q.acceptedVariants];

    if (!forms.some((f) => !NON_ASCII.test(strippable(f)))) {
      bad.push(`question ${q.id} ("${q.answerKey}")`);
    }
  }
  return bad;
}

/* --------------------------------------------------------------------------- */

function checkDir(
  dir: string,
  ranges: Range[],
  stats: { published: number; questions: number; modes: Record<string, number> } | null,
): string[] {
  const issues: string[] = [];
  if (!existsSync(dir)) return issues;

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const path = join(dir, file);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      issues.push(`${file}: not valid JSON — ${(err as Error).message}`);
      continue;
    }

    const parsed = Problem.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push(`${file}: ${issue.path.join(".") || "(root)"} — ${issue.message}`);
      }
      continue;
    }

    const problem = parsed.data;
    if (stats && problem.reviewStatus === "published") stats.published += 1;

    // Glyph coverage over every string in the record.
    const bad = uncoveredChars(allText(raw), ranges);
    if (bad.size > 0) {
      const list = [...bad.entries()]
        .slice(0, 8)
        .map(([ch, cp]) => `"${ch}" U+${cp.toString(16).toUpperCase().padStart(4, "0")}`)
        .join(", ");
      issues.push(
        `${file}: characters with no font coverage — ${list}${bad.size > 8 ? ` (+${bad.size - 8} more)` : ""}. ` +
          `Add a subset in ${CSS_FILE} before shipping this script.`,
      );
    }

    for (const issue of offTaxonomyTags(problem)) {
      issues.push(`${file}: ${issue}`);
    }

    for (const slot of badAnswerSlots(problem)) {
      issues.push(`${file}: ${slot}`);
    }

    for (const answer of untypeableAnswers(problem)) {
      issues.push(
        `${file}: ${answer} cannot be typed on a US keyboard, and no acceptedVariant can either. ` +
          `Add a plain-letter spelling, or the question is unanswerable however well it is solved.`,
      );
    }

    for (const field of markupInTextFields(problem)) {
      issues.push(
        `${file}: ${field} contains markup, but the site renders that field as plain text — ` +
          `the tags would be shown to the student. Use plain characters, or move it into an *Html field.`,
      );
    }

    // Referenced assets must exist. A missing figure in a problem where the
    // figure is the puzzle makes the problem unsolvable, not merely uglier.
    const referenced = new Set<string>();
    for (const asset of problem.assets) referenced.add(asset.src);
    for (const match of problem.bodyHtml.matchAll(/src="([^"]+)"/g)) referenced.add(match[1]);
    for (const q of problem.questions) {
      for (const match of q.promptHtml.matchAll(/src="([^"]+)"/g)) referenced.add(match[1]);
    }
    for (const src of referenced) {
      if (!src.startsWith(ASSETS_PREFIX)) {
        issues.push(`${file}: asset "${src}" is not under ${ASSETS_PREFIX}`);
        continue;
      }
      const onDisk = join(ASSETS_DIR, src.slice(ASSETS_PREFIX.length));
      if (!existsSync(onDisk)) issues.push(`${file}: asset file missing — ${onDisk}`);
    }

    for (const q of problem.questions) {
      if (stats) {
        stats.questions += 1;
        stats.modes[q.gradingMode] += 1;
      }
      if (!q.answerKey.trim()) {
        issues.push(`${file}: question ${q.id} has an empty answer key`);
      }
      if (q.choices && !q.choices.includes(q.answerKey)) {
        issues.push(`${file}: question ${q.id} has an answer key that is not one of its choices`);
      }
      if (q.gradingMode === "self" && !q.rubric) {
        issues.push(`${file}: question ${q.id} is self-graded but has no rubric`);
      }
    }
  }
  return issues;
}

function main() {
  if (!existsSync(PROBLEMS_DIR)) {
    console.log(`No content yet — ${PROBLEMS_DIR} does not exist. Nothing to validate.`);
    return;
  }

  const ranges = coveredRanges();
  const stats = { published: 0, questions: 0, modes: { exact: 0, llm: 0, self: 0 } };

  const errors = checkDir(PROBLEMS_DIR, ranges, stats);
  const draftWarnings = checkDir(DRAFTS_DIR, ranges, null);

  if (draftWarnings.length > 0) {
    console.warn(`\n${draftWarnings.length} draft warning(s) — not blocking, fix before promoting:\n`);
    for (const w of draftWarnings) console.warn(`  ${w}`);
    console.warn("");
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} problem(s) found:\n`);
    for (const e of errors) console.error(`  ${e}`);
    console.error("");
    process.exit(1);
  }

  const fileCount = readdirSync(PROBLEMS_DIR).filter((f) => f.endsWith(".json")).length;
  const exactPct = stats.questions ? Math.round((stats.modes.exact / stats.questions) * 100) : 0;
  console.log(
    `${fileCount} record(s) valid · ${stats.published} published · ${stats.questions} sub-questions ` +
      `(${stats.modes.exact} exact, ${stats.modes.llm} llm, ${stats.modes.self} self — ${exactPct}% exact)` +
      (existsSync(DRAFTS_DIR)
        ? ` · ${readdirSync(DRAFTS_DIR).filter((f) => f.endsWith(".json")).length} draft(s) awaiting review`
        : ""),
  );
}

main();
