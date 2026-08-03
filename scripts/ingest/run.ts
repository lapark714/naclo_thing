/**
 * Orchestrates stages 0 through 7 for a set of years.
 *
 *   npm run ingest -- 2016 2017          one or more years
 *   npm run ingest -- --all              every year in EXAMS
 *   npm run ingest -- --dry              manifest only, no API calls
 *
 * Drafting has already happened if content/drafts/<id>.a.json exists, so a
 * re-run after an interruption resumes rather than paying twice.
 */

import Anthropic from "@anthropic-ai/sdk";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Problem } from "../../content/schema";
import { buildManifest, EXAMS, readText, type Target } from "./manifest";
import { mapPool } from "./pool";
import { diffRecords } from "./diff";
import { checkWitness } from "./witness";
import { arbitrate, applyResolutions } from "./arbitrate";
import { cropFigures } from "./figures";
import { ensureCoverage } from "./fonts";
import { decide, writeRecord, renderReport, type Outcome } from "./publish";
import type { Flag } from "./types";

/**
 * Arbitration is one API call per flag. A problem with a handful of
 * disagreements is the only kind arbitration has any realistic chance of
 * rescuing. The first run resolved zero of sixteen attempts, confirming that
 * the arbitration prompt's bias toward UNRESOLVED is working as designed: a
 * parked problem costs a few minutes of review; a wrong answer key reaches a
 * student. Capping low keeps the possibility of a cheap rescue on a near-clean
 * problem while refusing to pay per-flag on problems that are going to park
 * regardless.
 */
const ARBITRATION_FLAG_CAP = 5;

function loadEnv() {
  if (!existsSync(".env")) return;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
  }
}
loadEnv();

function loadDraft(id: string, pass: "a" | "b"): Problem | null {
  const path = `content/drafts/${id}.${pass}.json`;
  if (!existsSync(path)) return null;
  const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  const parsed = Problem.safeParse(raw);
  if (!parsed.success) return null;
  // Zod strips unknown keys, and _reviewNotes is where the CROP lines live.
  // Stage 5 needs them, so carry it back across the parse.
  return { ...parsed.data, _reviewNotes: raw._reviewNotes } as Problem;
}

function renderForArbitration(target: Target, dir: string): string[] {
  const out: string[] = [];
  for (const page of target.problem.pages) {
    const base = join(dir, `arb-${page}`);
    execFileSync("pdftoppm", ["-png", "-r", "200", "-f", String(page), "-l", String(page), target.problem.file, base]);
    const found = [`${base}-${page}.png`, `${base}-0${page}.png`, `${base}-00${page}.png`]
      .find((p) => existsSync(p));
    if (found) out.push(found);
  }
  return out;
}

async function processOne(client: Anthropic, target: Target): Promise<Outcome | null> {
  const id = `${target.year}-open-${target.letter}`;

  const a = loadDraft(id, "a");
  const b = loadDraft(id, "b");
  if (!a) {
    console.warn(`  ${id}: no pass A draft — run npm run draft first`);
    return null;
  }

  let flags: Flag[] = [];

  // Stage 2 — the two passes against each other.
  if (b) flags.push(...diffRecords(a, b));
  else flags.push({ kind: "diff", path: "(pass B)", note: "pass B draft is missing or unparseable" });

  // Stage 3 — the booklet's own text, where there is one.
  if (target.hasTextLayer) {
    const pages = readText(target.problem.file).split("\f");
    const scope = target.problem.pages.map((p) => pages[p - 1] ?? "").join("\n");
    flags.push(...checkWitness(a, scope));
  }

  let record = a;
  const workDir = join(tmpdir(), `ingest-${id}`);

  try {
    mkdirSync(workDir, { recursive: true });

    // Stage 4 — arbitration, except for 2019.
    //
    // A booklet with no text layer is never auto-published, even when the two
    // passes agree on everything. Agreement cannot catch a correlated misread
    // (both passes reading ɲ as ŋ), and the witness that would is exactly what
    // is missing here. Drafting and diffing it is still worth the few dollars:
    // it turns eight untranscribed problems into eight nearly-finished records
    // that need a short review rather than a transcription.
    if (!target.hasTextLayer) {
      flags.push({
        kind: "diff",
        path: "(verification)",
        note:
          "this booklet has no usable text layer, so neither the witness check " +
          "nor arbitration can run. Parked for human review by policy, not by " +
          "a specific disagreement",
      });
    } else if (flags.length > ARBITRATION_FLAG_CAP) {
      // See ARBITRATION_FLAG_CAP: this many flags means the two passes read
      // different problems, not different values, so arbitrating field by
      // field would just be an expensive way to arrive at "park it".
      flags.push({
        kind: "diff",
        path: "(arbitration)",
        note:
          `skipped arbitration: ${flags.length} flags exceeds the cap of ` +
          `${ARBITRATION_FLAG_CAP}, so the two passes disagree too broadly to ` +
          "arbitrate field by field. Parked for human review instead of " +
          `spending ~${flags.length} API calls that would not resolve it`,
      });
    } else if (flags.length > 0) {
      const images = renderForArbitration(target, workDir);
      const pages = readText(target.problem.file).split("\f");
      const scope = target.problem.pages.map((p) => pages[p - 1] ?? "").join("\n");
      const resolutions = await arbitrate(client, target, flags, images, scope);
      const applied = applyResolutions(record, resolutions);
      record = applied.record;
      flags = applied.unresolved;
    }

    // Stage 5 — figures.
    const cropped = await cropFigures(client, target, record);
    record = cropped.record;
    flags.push(...cropped.flags);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }

  const outcome = decide(record, flags);
  writeRecord(outcome, record);
  console.log(
    `  ${id}: ${outcome.status}${outcome.flags.length ? ` (${outcome.flags.length} flag(s))` : ""}`,
  );
  return outcome;
}

/**
 * processOne runs inside mapPool across up to 58 problems at once. mapPool
 * itself has no try/catch around the callback (see pool.ts) — an uncaught
 * throw from one problem would reject the whole Promise.all and abort every
 * other problem still in flight or still queued, silently losing work that
 * had nothing to do with the failure. Tasks 6 and 7 each had to close this
 * same hole one level down (a bad crop, a bad font fetch); this is the same
 * fix at the orchestrator level. Every throw — a crashed subprocess, a
 * network error, anything processOne's own try/finally does not already
 * cover — degrades to a single parked outcome instead of aborting the batch,
 * and that outcome is a real Outcome so it still lands in the run report
 * rather than vanishing.
 */
async function safeProcessOne(client: Anthropic, target: Target): Promise<Outcome | null> {
  const id = `${target.year}-open-${target.letter}`;
  try {
    return await processOne(client, target);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ${id}: processOne crashed, parking as failed: ${message}`);
    return {
      id,
      status: "parked",
      flags: [{
        kind: "diff", path: "(crash)",
        note:
          `processOne threw before writeRecord ran: ${message}. No record was written for ` +
          `${id} this run — if it was already published or parked from an earlier run, that ` +
          "file is untouched and still stands; this outcome is reported for visibility only.",
      }],
      questionCount: 0,
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const years = args.includes("--all")
    ? Object.keys(EXAMS).map(Number)
    : args.filter((a) => /^\d{4}$/.test(a)).map(Number);

  if (years.length === 0) {
    console.error("Usage: npm run ingest -- <year>... | --all [--dry]");
    process.exit(1);
  }

  const manifest = buildManifest(years);
  console.log(`${manifest.length} problem(s) in scope.\n`);

  if (args.includes("--dry")) {
    for (const t of manifest) {
      console.log(`  ${t.year}-${t.letter}  pts=${t.officialPoints ?? "?"} authors=${t.authors.length} ${t.hasTextLayer ? "" : "NO TEXT LAYER"}`);
    }
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set (checked env and .env).");
    process.exit(1);
  }

  const client = new Anthropic();
  const results = await mapPool(manifest, 4, (t) => safeProcessOne(client, t));
  const outcomes = results.filter((o): o is Outcome => o !== null);

  // Stage 6 — fonts, over everything that published this run. Guarded: a
  // throw here (a corrupt published file, a font-subsetting failure) must
  // not cost the run report below. `outcomes` already reflects every record
  // this run wrote — published or parked — into content/, and that report
  // is the only human-facing summary of a run that has already changed it.
  try {
    const publishedRecords = outcomes
      .filter((o) => o.status === "published")
      .map((o) => Problem.parse(JSON.parse(readFileSync(`content/problems/${o.id}.json`, "utf8"))));
    const fontFlags = await ensureCoverage(publishedRecords);
    if (fontFlags.length > 0) {
      console.warn(`\n${fontFlags.length} font issue(s) — the affected problems need a subset by hand:`);
      for (const f of fontFlags) console.warn(`  ${f.path} ${f.a ?? ""} — ${f.note}`);
    }
  } catch (err) {
    console.error(`Stage 6 (fonts) failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const date = new Date().toISOString().slice(0, 10);
  mkdirSync("docs/ingest-runs", { recursive: true });
  const reportPath = `docs/ingest-runs/${date}.md`;
  writeFileSync(reportPath, renderReport(outcomes, date));

  const published = outcomes.filter((o) => o.status === "published").length;
  console.log(`\n${published} published, ${outcomes.length - published} parked. Report: ${reportPath}`);
  console.log(`Now run: npm run validate`);
}

main().catch((err) => {
  console.error(`ingest run failed: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
  process.exit(1);
});
