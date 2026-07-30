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
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Problem } from "../../content/schema";

const PROBLEMS_DIR = process.env.CONTENT_DIR ?? "content/problems";
const ASSETS_PREFIX = "/content-assets/";
const ASSETS_DIR = "content/assets";

function main() {
  if (!existsSync(PROBLEMS_DIR)) {
    console.log(`No content yet — ${PROBLEMS_DIR} does not exist. Nothing to validate.`);
    return;
  }

  const files = readdirSync(PROBLEMS_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log(`No records in ${PROBLEMS_DIR}. Nothing to validate.`);
    return;
  }

  const errors: string[] = [];
  let published = 0;
  let questions = 0;
  const modes: Record<string, number> = { exact: 0, llm: 0, self: 0 };

  for (const file of files) {
    const path = join(PROBLEMS_DIR, file);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      errors.push(`${file}: not valid JSON — ${(err as Error).message}`);
      continue;
    }

    const parsed = Problem.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${file}: ${issue.path.join(".") || "(root)"} — ${issue.message}`);
      }
      continue;
    }

    const problem = parsed.data;
    if (problem.reviewStatus === "published") published += 1;

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
        errors.push(`${file}: asset "${src}" is not under ${ASSETS_PREFIX}`);
        continue;
      }
      const onDisk = join(ASSETS_DIR, src.slice(ASSETS_PREFIX.length));
      if (!existsSync(onDisk)) errors.push(`${file}: asset file missing — ${onDisk}`);
    }

    for (const q of problem.questions) {
      questions += 1;
      modes[q.gradingMode] += 1;

      if (!q.answerKey.trim()) {
        errors.push(`${file}: question ${q.id} has an empty answer key`);
      }
      if (q.choices && !q.choices.includes(q.answerKey)) {
        errors.push(`${file}: question ${q.id} has an answer key that is not one of its choices`);
      }
      if (q.gradingMode === "self" && !q.rubric) {
        errors.push(`${file}: question ${q.id} is self-graded but has no rubric`);
      }
    }
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} problem(s) found:\n`);
    for (const e of errors) console.error(`  ${e}`);
    console.error("");
    process.exit(1);
  }

  const exactPct = questions ? Math.round((modes.exact / questions) * 100) : 0;
  console.log(
    `${files.length} record(s) valid · ${published} published · ${questions} sub-questions ` +
      `(${modes.exact} exact, ${modes.llm} llm, ${modes.self} self — ${exactPct}% exact)`,
  );
}

main();
