/**
 * Validates every content record before it can ship.
 *
 * Run by hand (`npm run validate`) and in CI. A non-zero exit blocks the build,
 * which is what keeps unreviewed or malformed records away from students.
 *
 * Checks, once content/schema.ts exists:
 *   - every record parses against the Zod Problem schema
 *   - every asset referenced by a record exists on disk
 *   - every sub-question has an answer key
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PROBLEMS_DIR = process.env.CONTENT_DIR ?? "content/problems";

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

  for (const file of files) {
    const path = join(PROBLEMS_DIR, file);
    try {
      JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      errors.push(`${file}: not valid JSON — ${(err as Error).message}`);
    }
  }

  // TODO: once content/schema.ts lands, parse each record with the Zod Problem
  // schema, confirm referenced assets exist, and confirm every sub-question has
  // an answerKey. Until then this only catches malformed JSON.

  if (errors.length > 0) {
    console.error(`\n${errors.length} invalid record(s):`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }

  console.log(`${files.length} record(s) parsed. Schema validation not wired up yet.`);
}

main();
