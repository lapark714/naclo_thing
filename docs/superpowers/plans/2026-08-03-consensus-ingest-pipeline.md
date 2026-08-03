# Consensus Ingest Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the library from 30 playable problems to 88 by drafting NACLO Open Rounds 2016–2022 in one unattended run, with automated cross-checking replacing human review on the publish path.

**Architecture:** Two decorrelated model passes per problem are compared against each other and against the booklet's own `pdftotext` layer. Fields the booklet states in machine-readable form (title, points, page spans, authors) are extracted deterministically and pinned so the model never owns them. Disagreements go to a per-flag arbitration call; anything unresolved parks in a committed queue rather than publishing.

**Tech Stack:** TypeScript run through `tsx`, `node:test` for tests (no new dependencies), `@anthropic-ai/sdk`, poppler (`pdftotext`, `pdftoppm`, `pdfinfo`) already installed via Homebrew, Zod schema in `content/schema.ts`.

**Spec:** `docs/superpowers/specs/2026-08-03-scaling-ingest-design.md`

## Global Constraints

- **Node 22, ESM, TypeScript strict.** No `any` without a written justification comment.
- **No new npm dependencies.** `tsx --test` runs `node:test`; this is verified working.
- **Model id:** `process.env.INGEST_MODEL || "claude-opus-5"`. Never hardcode a different one.
- **Concurrency cap: 4.** Higher trips rate limits on image-heavy requests.
- **Corpus: 2016, 2017, 2018, 2019, 2020, 2021, 2022.** 58 problems. 2023–2026 are already published and must never be touched or overwritten.
- **2019 is the exception year.** Its booklets return a substitution cipher from `pdftotext`. It gets no deterministic extraction, no witness check, and **no arbitration** — its two passes agree or the problem parks.
- **Park, never publish, on doubt.** A problem that fails any gate is written to `content/parked/`, never to `content/problems/`.
- **`content/drafts/` stays gitignored** (transient scratch). `content/parked/` is new and **committed**.
- **User-facing copy rules** (from `PRODUCT.md`): US spelling, no em dashes, written for a 12–17 year old.
- **Never bypass `validate.ts`.** It blocks the build by design.
- Run `npm run lint` before every commit.

---

## File Structure

| File | Responsibility |
|---|---|
| `scripts/ingest/manifest.ts` | **new** — Stage 0. Pure parsers over `pdftotext` output plus a manifest builder. |
| `scripts/ingest/pool.ts` | **new** — bounded-concurrency `mapPool`. |
| `scripts/ingest/types.ts` | **new** — the shared `Flag` type. |
| `scripts/ingest/diff.ts` | **new** — Stage 2. Factual-layer extraction and comparison. |
| `scripts/ingest/witness.ts` | **new** — Stage 3. Language data checked against the text layer. |
| `scripts/ingest/arbitrate.ts` | **new** — Stage 4. One model call per flag, plus resolution application. |
| `scripts/ingest/figures.ts` | **new** — Stage 5. Crop and confirm. |
| `scripts/ingest/fonts.ts` | **new** — Stage 6. Uncovered codepoints to Noto subsets. |
| `scripts/ingest/publish.ts` | **new** — Stage 7. Publish/park decision and the run report. |
| `scripts/ingest/run.ts` | **new** — orchestrates 0–7. |
| `scripts/ingest/draft.ts` | **modify** — two passes, uses `manifest.ts` and `pool.ts`. |
| `scripts/ingest/validate.ts` | **modify** — export the glyph helpers, guard `main()`. |
| `tests/ingest/*.test.ts` | **new** — one test file per module above. |

Each module exports pure functions where possible; the model calls sit behind thin wrappers so the parsing and application logic is testable without the network.

---

### Task 1: Test harness and manifest parsers (Stage 0)

**Files:**
- Modify: `package.json` (add `test` script)
- Create: `scripts/ingest/manifest.ts`
- Test: `tests/ingest/manifest.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  ```ts
  export type Booklet = { file: string; pages: number[] }
  export type Target = {
    year: number; letter: string; title: string;
    officialPoints: number | null;   // null when the booklet text layer is unreadable
    authors: string[];               // [] when unreadable
    problem: Booklet; solution?: Booklet;
    hasTextLayer: boolean;
  }
  export function parsePageMap(text: string): { pages: Map<string, number[]>; titles: Map<string, string> }
  export function parsePoints(text: string): Map<string, number>
  export function parseAuthors(text: string): Map<string, string[]>
  export function buildManifest(years: number[]): Target[]
  ```

Facts established by probing the real booklets, which the parsers must satisfy:

- Headers read `(A) Tangled Up In Nots (1/1) [5 points]`. **The points tag is case-varying**: 2016–2018 print `points`, 2020–2022 print `Points`, and 2021 mixes both inside one booklet. Match case-insensitively.
- Only the *first* page of a problem (`(1/n)`) carries the points tag.
- Authors appear in two shapes. `Problem A: Michael Salter` covers 2016, 2017, 2018, 2020, 2021. 2022 instead lists `(A) Michael Salter` under a `Problem Credits:` heading, interleaved with `Consultant:`, `Consultants:` and `Story Author:` lines that are **not** authors. Try the first shape; fall back to the second only when the first yields nothing.
- Multiple authors read `Dorottya Demszky, Yiwei Luo, and Tom McCoy`.
- 2019 yields nothing from any of these. That is expected and handled, not a bug.

- [ ] **Step 1: Add the test script**

In `package.json`, add to `"scripts"`:

```json
"test": "tsx --test tests/ingest/*.test.ts"
```

- [ ] **Step 2: Write the failing tests**

Create `tests/ingest/manifest.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePageMap, parsePoints, parseAuthors } from "../../scripts/ingest/manifest";

const BOOKLET =
  "cover page\f" +
  "Problem Credits:\nProblem A: Michael Salter\n" +
  "Problem B: Dorottya Demszky, Yiwei Luo, and Tom McCoy\f" +
  "(A) Tangled Up In Nots (1/1) [5 points]\nMalay is an Austronesian language\f" +
  "(B) DAWG Breeds (1/2) [10 Points]\nDAWG describes\f" +
  "(B) DAWG Breeds (2/2)\nmore of B\f";

test("parsePageMap finds each problem's page span and title", () => {
  const { pages, titles } = parsePageMap(BOOKLET);
  assert.deepEqual(pages.get("A"), [3]);
  assert.deepEqual(pages.get("B"), [4, 5]);
  assert.equal(titles.get("A"), "Tangled Up In Nots");
});

test("parsePoints reads the points tag in either case", () => {
  const pts = parsePoints(BOOKLET);
  assert.equal(pts.get("A"), 5);
  assert.equal(pts.get("B"), 10);
});

test("parsePoints ignores continuation pages", () => {
  assert.equal(parsePoints("(B) DAWG Breeds (2/2)\n").size, 0);
});

test("parseAuthors reads the 'Problem X:' form and splits on commas and 'and'", () => {
  const a = parseAuthors(BOOKLET);
  assert.deepEqual(a.get("A"), ["Michael Salter"]);
  assert.deepEqual(a.get("B"), ["Dorottya Demszky", "Yiwei Luo", "Tom McCoy"]);
});

test("parseAuthors falls back to the 2022 '(X) Name' form and skips consultant lines", () => {
  const credits =
    "Problem Credits:\n(A) Michael Salter\n(B) Tom McCoy\n" +
    "Consultant: Asli Celikyilmaz\n(D) Daniel Lovsted\n" +
    "Story Author: Jubli Sowati, collected by Kate Lindsey\n" +
    "Image Credits:\n(A), map: Adapted from maps by Wikipedia users\n";
  const a = parseAuthors(credits);
  assert.deepEqual(a.get("A"), ["Michael Salter"]);
  assert.deepEqual(a.get("B"), ["Tom McCoy"]);
  assert.deepEqual(a.get("D"), ["Daniel Lovsted"]);
  assert.equal(a.has("C"), false);
});

test("parsers return empty maps on a mojibake booklet rather than throwing", () => {
  const cipher = "Ϭ1;Ϳ garbled Ϭ2";
  assert.equal(parsePoints(cipher).size, 0);
  assert.equal(parseAuthors(cipher).size, 0);
  assert.equal(parsePageMap(cipher).pages.size, 0);
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../../scripts/ingest/manifest'`

- [ ] **Step 4: Implement `manifest.ts`**

Create `scripts/ingest/manifest.ts`:

```ts
/**
 * Stage 0 — everything the booklet states in machine-readable form.
 *
 * A field extracted here is pinned onto the record afterwards, so the model
 * never owns it and it needs no consensus check. That is worth more than
 * verifying a model-supplied value better: it leaves the error surface.
 *
 * The parsers are pure functions over `pdftotext` output so they can be tested
 * without a PDF. 2019's booklets embed a broken ToUnicode map and yield
 * nothing from any of them; that returns empty, never throws.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

export type Booklet = { file: string; pages: number[] };

export type Target = {
  year: number;
  letter: string;
  title: string;
  /** null when the booklet's text layer is unreadable; the model supplies it instead. */
  officialPoints: number | null;
  /** [] when unreadable, same reason. */
  authors: string[];
  problem: Booklet;
  solution?: Booklet;
  /** False for 2019. Disables the witness check and arbitration downstream. */
  hasTextLayer: boolean;
};

export const EXAMS: Record<number, { problems: string; solutions: string }> = {
  2016: { problems: "pdfs/NACLO2016ROUND1.pdf", solutions: "pdfs/NACLO2016ROUND1SOLUTIONS.pdf" },
  2017: { problems: "pdfs/NACLO2017ROUND1.pdf", solutions: "pdfs/NACLO2017ROUND1SOLUTIONS.pdf" },
  2018: { problems: "pdfs/NACLO2018ROUND1.pdf", solutions: "pdfs/NACLO2018ROUND1SOL.pdf" },
  2019: { problems: "pdfs/NACLO2019ROUND1.pdf", solutions: "pdfs/NACLO2019ROUND1SOL.pdf" },
  2020: { problems: "pdfs/NACLO2020ROUND1.pdf", solutions: "pdfs/NACLO2020ROUND1SOL.pdf" },
  2021: { problems: "pdfs/NACLO2021ROUND1.pdf", solutions: "pdfs/NACLO2021ROUND1SOL.pdf" },
  2022: { problems: "pdfs/NACLO2022ROUND1.pdf", solutions: "pdfs/NACLO2022ROUND1SOL.pdf" },
};

/**
 * Hand-checked page maps for booklets whose embedded text is mojibake.
 * 2019: both booklets embed a subsetted font with a broken ToUnicode map, but
 * the header furniture survives the cipher, which pins all eight problems.
 * Verified against the rendered pages.
 */
export const MANUAL_PAGES: Record<string, Record<string, number[]>> = {
  "pdfs/NACLO2019ROUND1.pdf": {
    A: [8, 9], B: [10], C: [11], D: [12, 13, 14],
    E: [15], F: [16, 17], G: [18, 19], H: [20, 21],
  },
  "pdfs/NACLO2019ROUND1SOL.pdf": {
    A: [2], B: [3], C: [4], D: [5], E: [6], F: [7], G: [8], H: [9],
  },
};

const HEADER = /\(([A-Z])\)\s+(.+?)\s+\((\d+)\/(\d+)\)/;
/** Case-varies across years, and inside 2021's own booklet. */
const POINTS = /\(([A-Z])\)\s+.+?\s+\(1\/\d+\)\s*\[(\d+)\s*points?\]/gi;
const AUTHOR_LABELLED = /^Problem ([A-Z]):\s*(.+)$/gm;
const AUTHOR_PARENTHESISED = /^\(([A-Z])\)\s+([A-Z].*)$/gm;

export function readText(file: string): string {
  return execFileSync("pdftotext", [file, "-"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

export function parsePageMap(text: string): {
  pages: Map<string, number[]>;
  titles: Map<string, string>;
} {
  const pages = new Map<string, number[]>();
  const titles = new Map<string, string>();

  text.split("\f").forEach((page, i) => {
    const m = page.match(HEADER);
    if (!m) return;
    const [, letter, title] = m;
    if (!pages.has(letter)) pages.set(letter, []);
    pages.get(letter)!.push(i + 1);
    if (!titles.has(letter)) titles.set(letter, title.replace(/\s+/g, " ").trim());
  });
  return { pages, titles };
}

export function parsePoints(text: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of text.matchAll(POINTS)) {
    if (!out.has(m[1])) out.set(m[1], Number(m[2]));
  }
  return out;
}

function splitNames(raw: string): string[] {
  return raw
    .replace(/\band\b/g, ",")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^(consultants?|story author|image credits)\b/i.test(s));
}

export function parseAuthors(text: string): Map<string, string[]> {
  const out = new Map<string, string[]>();

  for (const m of text.matchAll(AUTHOR_LABELLED)) {
    const names = splitNames(m[2]);
    if (names.length > 0) out.set(m[1], names);
  }
  if (out.size > 0) return out;

  // 2022's shape. Scope to the credits block so body headers like "(A) Lines
  // in the Sand" cannot be mistaken for a byline.
  const start = text.search(/^Problem Credits:/m);
  if (start === -1) return out;
  const after = text.slice(start);
  const end = after.search(/^Image Credits:/m);
  const block = end === -1 ? after : after.slice(0, end);

  for (const m of block.matchAll(AUTHOR_PARENTHESISED)) {
    const names = splitNames(m[2]);
    if (names.length > 0) out.set(m[1], names);
  }
  return out;
}

export function buildManifest(years: number[]): Target[] {
  const targets: Target[] = [];

  for (const year of years) {
    const files = EXAMS[year];
    if (!files || !existsSync(files.problems)) {
      console.warn(`  ${year}: no booklet at ${files?.problems ?? "(unmapped year)"} — skipping`);
      continue;
    }

    const manualProblem = MANUAL_PAGES[files.problems];
    const hasTextLayer = !manualProblem;

    const problemText = hasTextLayer ? readText(files.problems) : "";
    const map = hasTextLayer
      ? parsePageMap(problemText)
      : { pages: new Map(Object.entries(manualProblem)), titles: new Map<string, string>() };

    const points = hasTextLayer ? parsePoints(problemText) : new Map<string, number>();
    const authors = hasTextLayer ? parseAuthors(problemText) : new Map<string, string[]>();

    const manualSolution = MANUAL_PAGES[files.solutions];
    const solutionPages = manualSolution
      ? new Map(Object.entries(manualSolution))
      : existsSync(files.solutions)
        ? parsePageMap(readText(files.solutions)).pages
        : new Map<string, number[]>();

    for (const [letter, pp] of [...map.pages.entries()].sort()) {
      targets.push({
        year,
        letter,
        title: map.titles.get(letter) ?? "(title unknown)",
        officialPoints: points.get(letter) ?? null,
        authors: authors.get(letter) ?? [],
        problem: { file: files.problems, pages: pp },
        solution: solutionPages.has(letter)
          ? { file: files.solutions, pages: solutionPages.get(letter)! }
          : undefined,
        hasTextLayer,
      });
    }
  }
  return targets;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const years = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
  const manifest = buildManifest(years.length ? years : Object.keys(EXAMS).map(Number));
  for (const t of manifest) {
    console.log(
      `  ${t.year}-${t.letter}  ${t.title.slice(0, 40).padEnd(42)} ` +
        `p${t.problem.pages.join(",")}  pts=${t.officialPoints ?? "?"}  ` +
        `authors=${t.authors.length || "?"}  ${t.hasTextLayer ? "" : "NO TEXT LAYER"}`,
    );
  }
  console.log(`\n${manifest.length} problems.`);
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS, 6 tests.

- [ ] **Step 6: Smoke-check against the real booklets**

Run: `npx tsx scripts/ingest/manifest.ts 2016 2017 2018 2019 2020 2021 2022`

Expected: 58 rows. Every year except 2019 shows a numeric `pts=` and `authors>=1`. 2019's eight rows show `pts=?  authors=?  NO TEXT LAYER`. If any non-2019 row shows `pts=?`, the points regex needs widening before continuing — do not proceed with a partial deterministic tier.

- [ ] **Step 7: Commit**

```bash
npm run lint
git add package.json scripts/ingest/manifest.ts tests/ingest/manifest.test.ts
git commit -m "Extract what the booklet already states, instead of asking the model

Title, page spans, official points and author bylines all sit in the
booklet text layer in machine-readable form. Pinning them means they
cannot be wrong, which is worth more than verifying them better.

Covers 50 of the 58 target problems. 2019's booklets are mojibake and
fall back to model-supplied values."
```

---

### Task 2: Bounded concurrency and two decorrelated drafts (Stage 1)

**Files:**
- Create: `scripts/ingest/pool.ts`
- Modify: `scripts/ingest/draft.ts`
- Test: `tests/ingest/pool.test.ts`

**Interfaces:**
- Consumes: `Target`, `buildManifest` from Task 1
- Produces:
  ```ts
  // pool.ts
  export async function mapPool<T, R>(
    items: readonly T[], limit: number,
    fn: (item: T, index: number) => Promise<R>,
  ): Promise<R[]>

  // draft.ts
  export type Pass = "a" | "b"
  export async function draftPass(
    client: Anthropic, target: Target, pass: Pass, force: boolean,
  ): Promise<"done" | "skipped" | "failed">
  ```

Pass A renders at 150 dpi with a cell-by-cell row-major instruction; pass B renders at 300 dpi with a holistic instruction. Drafts are written to `content/drafts/<id>.a.json` and `<id>.b.json`.

- [ ] **Step 1: Write the failing pool tests**

Create `tests/ingest/pool.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mapPool } from "../../scripts/ingest/pool";

test("preserves input order regardless of completion order", async () => {
  const delays = [30, 5, 20, 1];
  const out = await mapPool(delays, 4, async (d, i) => {
    await new Promise((r) => setTimeout(r, d));
    return i;
  });
  assert.deepEqual(out, [0, 1, 2, 3]);
});

test("never exceeds the concurrency limit", async () => {
  let active = 0;
  let peak = 0;
  await mapPool(Array.from({ length: 20 }, (_, i) => i), 4, async () => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 5));
    active -= 1;
  });
  assert.ok(peak <= 4, `peak concurrency was ${peak}`);
});

test("handles an empty list", async () => {
  assert.deepEqual(await mapPool([], 4, async () => 1), []);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test`
Expected: FAIL — cannot find `../../scripts/ingest/pool`

- [ ] **Step 3: Implement `pool.ts`**

```ts
/**
 * Bounded-concurrency map. 58 problems at two passes each is 116 API calls;
 * sequentially that is most of a day, at four concurrent it is about an hour.
 * Four is the cap because these requests carry several full-page images and
 * higher rates trip the API's limits.
 */
export async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  };

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker),
  );
  return results;
}
```

- [ ] **Step 4: Run and confirm the pool tests pass**

Run: `npm test`
Expected: PASS, 9 tests total.

- [ ] **Step 5: Rework `draft.ts` for two passes**

In `scripts/ingest/draft.ts`, delete the local `EXAMS`, `MANUAL_PAGES`, `HEADER`, `Booklet`, `Target`, `mapBooklet` and `buildManifest` definitions (they now live in `manifest.ts`) and import instead:

```ts
import { buildManifest, type Target } from "./manifest";
import { mapPool } from "./pool";
```

Keep the existing `SYSTEM` string exactly as it is, rename it `SYSTEM_BASE`, and add below it:

```ts
export type Pass = "a" | "b";

/**
 * The two passes must fail differently or agreement proves nothing. A model
 * misreading a glyph at 150dpi will often misread it the same way twice, so
 * the passes differ in resolution and in reading order.
 */
const PASS_STYLE: Record<Pass, { dpi: number; instruction: string }> = {
  a: {
    dpi: 150,
    instruction:
      "\n\nREADING ORDER: work through every table strictly cell by cell, " +
      "row by row, left to right. Read each cell in isolation before moving " +
      "on, and do not infer a cell's content from the pattern of its " +
      "neighbours.",
  },
  b: {
    dpi: 300,
    instruction:
      "\n\nREADING ORDER: read each page as a whole first and understand what " +
      "the problem is asking, then transcribe. Where a glyph is ambiguous, " +
      "resolve it from the language's overall inventory as shown across the " +
      "whole data set rather than from the single mark on the page.",
  },
};
```

Change `renderPages` to take a dpi argument:

```ts
function renderPages(file: string, pages: number[], dir: string, prefix: string, dpi: number): string[] {
```

and pass `String(dpi)` where `"150"` is currently hardcoded in the `pdftoppm` argument list.

Replace the body of `draftOne` with a `draftPass` that takes a pass letter, writes to `content/drafts/<id>.<pass>.json`, and uses `SYSTEM_BASE + PASS_STYLE[pass].instruction` as the system prompt and `PASS_STYLE[pass].dpi` for rendering. Pin the manifest fields, extending the existing pinned block:

```ts
    const pinned: Record<string, unknown> = {
      ...(record as Record<string, unknown>),
      id,
      tier: "full",
      year: target.year,
      round: "open",
      letter: target.letter,
      title: target.title,
      sourcePdfUrl: "https://naclo.org/practice.php",
      reviewStatus: "drafted",
    };
    // Deterministic where the booklet is readable; model-supplied for 2019,
    // where it gets consensus-checked like any other model output.
    if (target.officialPoints !== null) pinned.officialPoints = target.officialPoints;
    if (target.authors.length > 0) pinned.authors = target.authors;
```

Replace the sequential `for (const target of selected)` loop in `main()` with:

```ts
  const jobs = selected.flatMap((t) => (["a", "b"] as Pass[]).map((pass) => ({ t, pass })));
  const outcomes = await mapPool(jobs, 4, async ({ t, pass }) => {
    try {
      return await draftPass(client, t, pass, force);
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) {
        await new Promise((r) => setTimeout(r, 60_000));
        try {
          return await draftPass(client, t, pass, force);
        } catch {
          return "failed" as const;
        }
      }
      console.error(`  ${t.year}-${t.letter}.${pass}: ${(err as Error).message}`);
      return "failed" as const;
    }
  });
```

and count `outcomes` for the summary line.

- [ ] **Step 6: Verify against one real problem**

Run: `npx tsx scripts/ingest/draft.ts 2016-A`

Expected: `content/drafts/2016-open-A.a.json` and `content/drafts/2016-open-A.b.json` both exist. Confirm the pinned fields took:

```bash
node -e 'const r=require("./content/drafts/2016-open-A.a.json");console.log(r.officialPoints, r.authors, r.title)'
```

Expected: `5 [ 'Bozhidar Bozhanov' ] Tangled Up In Nots`

- [ ] **Step 7: Commit**

```bash
npm run lint
git add scripts/ingest/pool.ts scripts/ingest/draft.ts tests/ingest/pool.test.ts
git commit -m "Draft each problem twice, at different resolutions and reading orders

Agreement between two passes only means something if they can fail
differently. Pass A reads cell by cell at 150dpi, pass B holistically at
300dpi, which attacks the correlated-misread failure mode directly.

Also moves drafting onto a concurrency-4 pool: 116 calls sequentially is
most of a day, and about an hour pooled."
```

---

### Task 3: Factual-layer diff (Stage 2)

**Files:**
- Create: `scripts/ingest/types.ts`, `scripts/ingest/diff.ts`
- Test: `tests/ingest/diff.test.ts`

**Interfaces:**
- Consumes: `Problem` from `content/schema.ts`
- Produces:
  ```ts
  // types.ts
  export type Flag = {
    kind: "diff" | "witness" | "figure" | "font"
    path: string          // "q:A1.a:key", "cell:12", "data:3"
    a?: string            // pass A's value
    b?: string            // pass B's value
    note?: string
  }

  // diff.ts
  export function stripTags(html: string): string
  export function tableCells(html: string): string[]
  export function dataSpans(html: string): string[]
  export function factualLayer(p: Problem): Map<string, string>
  export function diffRecords(a: Problem, b: Problem): Flag[]
  ```

Only the factual layer is compared: question ids, grading modes, answer keys, accepted variants, points, choices, table cells, and language-data spans. Hints, explanations, prompts and prose are excluded — they are creative text that will never match across passes, and diffing them yields noise rather than signal.

- [ ] **Step 1: Write the failing tests**

Create `tests/ingest/diff.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { stripTags, tableCells, dataSpans, factualLayer, diffRecords } from "../../scripts/ingest/diff";
import type { Problem } from "../../content/schema";

function record(over: Partial<Problem> = {}): Problem {
  return {
    id: "2016-open-A", tier: "full", year: 2016, round: "open", letter: "A",
    title: "T", authors: ["X"], sourcePdfUrl: "https://naclo.org/practice.php",
    conceptTags: ["morphology"], formTag: "rosetta-stone", difficulty: "intro",
    languages: [], officialPoints: 5, officialTimeMinutes: 10,
    bodyHtml: "", assets: [],
    questions: [{
      id: "A1.a", promptHtml: "p", gradingMode: "exact",
      answerKey: "kecantikan", acceptedVariants: [], points: 1,
    }],
    hints: [], explanationHtml: "", reviewStatus: "drafted",
    ...over,
  } as Problem;
}

test("stripTags removes markup and collapses whitespace", () => {
  assert.equal(stripTags("<b>ha</b>\n  <i>lo</i>"), "ha lo");
  assert.equal(stripTags("a &amp; b"), "a & b");
});

test("tableCells reads cells in document order", () => {
  const html = "<table><tr><th>a</th><td>b</td></tr><tr><td>c</td></tr></table>";
  assert.deepEqual(tableCells(html), ["a", "b", "c"]);
});

test("dataSpans collects data spans and gloss-list terms", () => {
  const html = '<p><span class="data">marlu</span></p><dl><dt>hąąhere</dt><dd>fish</dd></dl>';
  assert.deepEqual(dataSpans(html), ["marlu", "hąąhere", "fish"]);
});

test("identical records produce no flags", () => {
  assert.deepEqual(diffRecords(record(), record()), []);
});

test("a differing answer key is flagged with both candidates", () => {
  const flags = diffRecords(
    record(),
    record({ questions: [{ id: "A1.a", promptHtml: "p", gradingMode: "exact", answerKey: "kecantikaan", acceptedVariants: [], points: 1 }] } as Partial<Problem>),
  );
  assert.equal(flags.length, 1);
  assert.equal(flags[0].path, "q:A1.a:key");
  assert.equal(flags[0].a, "kecantikan");
  assert.equal(flags[0].b, "kecantikaan");
});

test("differing prose does NOT flag", () => {
  const flags = diffRecords(
    record({ explanationHtml: "<p>one way of saying it</p>", hints: [{ tier: 1, text: "look here", xpCost: 1 }] } as Partial<Problem>),
    record({ explanationHtml: "<p>quite another</p>", hints: [{ tier: 1, text: "look there", xpCost: 1 }] } as Partial<Problem>),
  );
  assert.deepEqual(flags, []);
});

test("a question present in only one pass is flagged", () => {
  const flags = diffRecords(record(), record({ questions: [] } as Partial<Problem>));
  assert.ok(flags.some((f) => f.note === "absent in pass B"));
});

test("a differing table cell is flagged", () => {
  const flags = diffRecords(
    record({ bodyHtml: "<table><tr><td>ɲam</td></tr></table>" } as Partial<Problem>),
    record({ bodyHtml: "<table><tr><td>ŋam</td></tr></table>" } as Partial<Problem>),
  );
  assert.equal(flags.length, 1);
  assert.equal(flags[0].a, "ɲam");
  assert.equal(flags[0].b, "ŋam");
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test`
Expected: FAIL — cannot find `../../scripts/ingest/diff`

- [ ] **Step 3: Implement `types.ts` and `diff.ts`**

`scripts/ingest/types.ts`:

```ts
/** One thing the pipeline could not vouch for on its own. */
export type Flag = {
  kind: "diff" | "witness" | "figure" | "font";
  /** Addresses the disputed value: "q:A1.a:key", "cell:12", "data:3". */
  path: string;
  /** Pass A's value, where there is one. */
  a?: string;
  /** Pass B's value, where there is one. */
  b?: string;
  note?: string;
};
```

`scripts/ingest/diff.ts`:

```ts
/**
 * Stage 2 — compare what the two passes claim as fact.
 *
 * Only the factual layer is compared. Hints, explanations and prompts are
 * creative prose: two passes will word them differently every time, and
 * diffing them would bury the real signal in noise. They are constrained
 * elsewhere (three tiers, no answer revealed, no uncovered glyph) rather than
 * cross-checked.
 */

import type { Problem } from "../../content/schema";
import type { Flag } from "./types";

export function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/\s+/g, " ")
    .trim();
}

export function tableCells(html: string): string[] {
  return [...html.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]));
}

export function dataSpans(html: string): string[] {
  const out = [...html.matchAll(/<span\b[^>]*class="[^"]*\bdata\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)]
    .map((m) => stripTags(m[1]));
  for (const m of html.matchAll(/<(dt|dd)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    out.push(stripTags(m[2]));
  }
  return out;
}

/** Flattens a record to path to value over only the fields that state fact. */
export function factualLayer(p: Problem): Map<string, string> {
  const m = new Map<string, string>();

  for (const q of p.questions) {
    m.set(`q:${q.id}:mode`, q.gradingMode);
    m.set(`q:${q.id}:key`, q.answerKey);
    m.set(`q:${q.id}:points`, String(q.points));
    m.set(`q:${q.id}:variants`, [...q.acceptedVariants].sort().join("|"));
    if (q.choices) m.set(`q:${q.id}:choices`, q.choices.join("|"));
  }
  tableCells(p.bodyHtml).forEach((cell, i) => m.set(`cell:${i}`, cell));
  dataSpans(p.bodyHtml).forEach((d, i) => m.set(`data:${i}`, d));

  return m;
}

export function diffRecords(a: Problem, b: Problem): Flag[] {
  const fa = factualLayer(a);
  const fb = factualLayer(b);
  const flags: Flag[] = [];

  for (const [path, va] of fa) {
    const vb = fb.get(path);
    if (vb === undefined) flags.push({ kind: "diff", path, a: va, note: "absent in pass B" });
    else if (vb !== va) flags.push({ kind: "diff", path, a: va, b: vb });
  }
  for (const [path, vb] of fb) {
    if (!fa.has(path)) flags.push({ kind: "diff", path, b: vb, note: "absent in pass A" });
  }
  return flags;
}
```

- [ ] **Step 4: Run and confirm the tests pass**

Run: `npm test`
Expected: PASS, 17 tests total.

- [ ] **Step 5: Commit**

```bash
npm run lint
git add scripts/ingest/types.ts scripts/ingest/diff.ts tests/ingest/diff.test.ts
git commit -m "Compare only what the two passes claim as fact

Answer keys, grading modes, points, choices, table cells and language
data are compared cell by cell. Hints and explanations are deliberately
excluded: two passes will word prose differently every time, and diffing
it would bury the real disagreements in noise."
```

---

### Task 4: Text-layer witness (Stage 3)

**Files:**
- Create: `scripts/ingest/witness.ts`
- Test: `tests/ingest/witness.test.ts`

**Interfaces:**
- Consumes: `dataSpans` from Task 3, `Flag` from Task 3
- Produces:
  ```ts
  export function normalizeForWitness(s: string): string
  export function checkWitness(p: Problem, pageText: string): Flag[]
  ```

This is the strongest gate in the pipeline. Unlike a second model pass, the text layer is an independent witness that cannot hallucinate a glyph — it either contains the character or it does not. It caught three of the five errors in the 2023 review batch.

Scope is deliberately limited to **body language data**, which is provably verbatim from the booklet. Answer keys are excluded: many are translations or constructed answers that never appear in the source, so checking them would produce constant false flags. Keys are covered by the Task 3 diff instead.

- [ ] **Step 1: Write the failing tests**

Create `tests/ingest/witness.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeForWitness, checkWitness } from "../../scripts/ingest/witness";
import type { Problem } from "../../content/schema";

function withBody(bodyHtml: string): Problem {
  return {
    id: "x", tier: "full", year: 2016, round: "open", letter: "A", title: "T",
    authors: ["X"], sourcePdfUrl: "https://naclo.org/practice.php",
    conceptTags: ["phonology"], formTag: "rule-discovery", difficulty: "intro",
    languages: [], officialPoints: 5, officialTimeMinutes: 10,
    bodyHtml, assets: [], questions: [], hints: [], explanationHtml: "",
    reviewStatus: "drafted",
  } as Problem;
}

test("normalizeForWitness collapses whitespace and composes marks", () => {
  assert.equal(normalizeForWitness("há  ere"), "áere".normalize("NFC"));
});

test("data present in the text layer produces no flag", () => {
  const p = withBody('<p><span class="data">hąąhere</span></p>');
  assert.deepEqual(checkWitness(p, "the word hąąhere means fish"), []);
});

test("a substituted consonant is caught", () => {
  const p = withBody('<table><tr><td><span class="data">ŋam</span></td></tr></table>');
  const flags = checkWitness(p, "the form ɲam appears here");
  assert.equal(flags.length, 1);
  assert.equal(flags[0].kind, "witness");
  assert.equal(flags[0].a, "ŋam");
});

test("dropped characters are caught", () => {
  const p = withBody('<dl><dt>olohelohealun</dt><dd>gloss</dd></dl>');
  const flags = checkWitness(p, "oloheloheamalun is the string");
  assert.ok(flags.some((f) => f.a === "olohelohealun"));
});

test("single characters are skipped, being too common to be evidence", () => {
  const p = withBody('<dl><dt>a</dt><dd>b</dd></dl>');
  assert.deepEqual(checkWitness(p, "nothing relevant"), []);
});

test("line breaks in the text layer do not cause false flags", () => {
  const p = withBody('<p><span class="data">banka balülü</span></p>');
  assert.deepEqual(checkWitness(p, "banka\nbalülü bamwi"), []);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test`
Expected: FAIL — cannot find `../../scripts/ingest/witness`

- [ ] **Step 3: Implement `witness.ts`**

```ts
/**
 * Stage 3 — check the model's language data against the booklet's own text.
 *
 * This is the strongest gate here. A second model pass can repeat the first
 * one's misreading; the text layer cannot, because it does not read at all. It
 * either contains the character or it does not. Three of the five errors found
 * in the 2023 review batch were of exactly this shape: ɲ transcribed as ŋ,
 * and two characters silently dropped from a Hawaiian string.
 *
 * Deliberately scoped to body language data, which is verbatim from the
 * booklet. Answer keys are often translations or constructed values that never
 * appear in the source, so checking them here would flag constantly; the
 * two-pass diff covers them instead.
 *
 * Not run for 2019, whose booklets return a substitution cipher.
 */

import type { Problem } from "../../content/schema";
import type { Flag } from "./types";
import { dataSpans } from "./diff";

/** Whitespace is meaningless across a PDF line break; composition is not. */
export function normalizeForWitness(s: string): string {
  return s.normalize("NFC").replace(/[\s ​]+/g, "");
}

export function checkWitness(p: Problem, pageText: string): Flag[] {
  const haystack = normalizeForWitness(pageText);
  const flags: Flag[] = [];

  dataSpans(p.bodyHtml).forEach((token, i) => {
    const needle = normalizeForWitness(token);
    // One character is too common to be evidence either way.
    if (needle.length < 2) return;
    if (!haystack.includes(needle)) {
      flags.push({
        kind: "witness",
        path: `data:${i}`,
        a: token,
        note: "does not appear in the booklet text layer",
      });
    }
  });
  return flags;
}
```

- [ ] **Step 4: Run and confirm the tests pass**

Run: `npm test`
Expected: PASS, 23 tests total.

- [ ] **Step 5: Verify it catches a real historical error**

The 2023 D record shipped after its `ɲ`/`ŋ` confusion was corrected by hand, so it should now pass its own witness check. Confirm the check runs clean against a known-good record:

```bash
npx tsx -e '
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { checkWitness } from "./scripts/ingest/witness";
const p = JSON.parse(readFileSync("content/problems/2023-open-D.json", "utf8"));
const text = execFileSync("pdftotext", ["pdfs/NACLO2023ROUND1.pdf", "-"], { encoding: "utf8", maxBuffer: 6.4e7 });
const flags = checkWitness(p, text);
console.log(flags.length + " flag(s)");
for (const f of flags.slice(0, 10)) console.log("  ", f.path, JSON.stringify(f.a));
'
```

Expected: a low flag count. Some flags are legitimate — a data span the transcription reflowed, or text that lives in a cropped figure rather than the text layer. Read them. If the count is high (more than about 15% of spans), the normalization needs loosening before this gate is trusted at scale; record what you changed and why in the commit message.

- [ ] **Step 6: Commit**

```bash
npm run lint
git add scripts/ingest/witness.ts tests/ingest/witness.test.ts
git commit -m "Check language data against the booklet's own text layer

A second model pass can repeat the first one's misreading. The text
layer cannot, because it does not read: it either holds the character or
it does not. Three of the five errors caught in the 2023 review batch
were exactly this shape.

Scoped to body language data, which is verbatim from the source. Answer
keys are often translations that never appear in it, so they stay with
the two-pass diff."
```

---

### Task 5: Arbitration (Stage 4)

**Files:**
- Create: `scripts/ingest/arbitrate.ts`
- Test: `tests/ingest/arbitrate.test.ts`

**Interfaces:**
- Consumes: `Flag` (Task 3), `Target` (Task 1)
- Produces:
  ```ts
  export type Resolution = { path: string; value: string | null }  // null = unresolved
  export function buildArbitrationPrompt(flag: Flag, textExcerpt: string): string
  export function parseArbitrationReply(reply: string): string | null
  export function applyResolutions(
    p: Problem, resolutions: Resolution[],
  ): { record: Problem; unresolved: Flag[] }
  export async function arbitrate(
    client: Anthropic, target: Target, flags: Flag[], pageImages: string[], pageText: string,
  ): Promise<Resolution[]>
  ```

One model call per flag, each receiving both candidates, the page images, and the surrounding text-layer excerpt. Cheap because it runs per disagreement rather than per problem.

**2019 never reaches this stage.** With no text layer there is no independent evidence to arbitrate against, and re-reading the same images that produced the disagreement would launder a guess into a decision.

- [ ] **Step 1: Write the failing tests**

Create `tests/ingest/arbitrate.test.ts`:

```ts
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
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test`
Expected: FAIL — cannot find `../../scripts/ingest/arbitrate`

- [ ] **Step 3: Implement `arbitrate.ts`**

```ts
/**
 * Stage 4 — resolve a disagreement with evidence neither pass had.
 *
 * One call per flag. The arbiter sees both candidates, the rendered pages, and
 * the surrounding text-layer excerpt, and must either pick a value or say
 * UNRESOLVED. Defaulting to UNRESOLVED is correct: an unresolved flag parks the
 * problem for a human, which is cheap, whereas a confidently wrong answer key
 * reaches a student.
 *
 * Never called for 2019. With no text layer there is no evidence beyond the
 * same images that produced the disagreement.
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import type { Problem } from "../../content/schema";
import type { Flag } from "./types";
import type { Target } from "./manifest";
import { normalizeForWitness } from "./witness";

export type Resolution = { path: string; value: string | null };

const MODEL = process.env.INGEST_MODEL || "claude-opus-5";

export function buildArbitrationPrompt(flag: Flag, textExcerpt: string): string {
  return [
    `Two independent transcriptions of this NACLO problem disagree about one value.`,
    ``,
    `Field: ${flag.path}`,
    `Candidate A: ${JSON.stringify(flag.a ?? "(absent)")}`,
    `Candidate B: ${JSON.stringify(flag.b ?? "(absent)")}`,
    flag.note ? `Note: ${flag.note}` : ``,
    ``,
    `Text extracted directly from the PDF near this value:`,
    `"""`,
    textExcerpt.slice(0, 2000),
    `"""`,
    ``,
    `Decide from the page images and that extracted text which value the`,
    `booklet actually prints. Pay attention to the exact characters: ɲ and ŋ`,
    `are different letters, as are ɾ and r, and a missing diacritic changes`,
    `the data.`,
    ``,
    `Reply with exactly one line, either:`,
    `VALUE: <the correct value>`,
    `or:`,
    `UNRESOLVED`,
    ``,
    `Answer UNRESOLVED unless the evidence is clear. A parked problem costs a`,
    `few minutes of review; a wrong answer key reaches a student.`,
  ].filter(Boolean).join("\n");
}

export function parseArbitrationReply(reply: string): string | null {
  const m = reply.trim().match(/^VALUE:\s*(.+)$/m);
  if (!m) return null;
  const value = m[1].trim();
  return value.length > 0 ? value : null;
}

/** Locates a small window of source text around a candidate, for context. */
function excerptFor(flag: Flag, pageText: string): string {
  const needle = normalizeForWitness(flag.a ?? flag.b ?? "");
  if (needle.length < 2) return pageText.slice(0, 2000);
  const flat = normalizeForWitness(pageText);
  const at = flat.indexOf(needle);
  if (at === -1) return pageText.slice(0, 2000);
  // Map back approximately: normalized indices run ahead of raw ones, so widen.
  const ratio = pageText.length / Math.max(1, flat.length);
  const centre = Math.floor(at * ratio);
  return pageText.slice(Math.max(0, centre - 600), centre + 600);
}

export function applyResolutions(
  p: Problem,
  resolutions: Resolution[],
): { record: Problem; unresolved: Flag[] } {
  const record: Problem = JSON.parse(JSON.stringify(p));
  const unresolved: Flag[] = [];

  for (const r of resolutions) {
    if (r.value === null) {
      unresolved.push({ kind: "diff", path: r.path, note: "arbitration returned UNRESOLVED" });
      continue;
    }
    const q = r.path.match(/^q:(.+):(key|mode|points|variants|choices)$/);
    if (q) {
      const target = record.questions.find((x) => x.id === q[1]);
      if (!target) {
        unresolved.push({ kind: "diff", path: r.path, note: "names no question in the record" });
        continue;
      }
      if (q[2] === "key") target.answerKey = r.value;
      else if (q[2] === "mode") target.gradingMode = r.value as Problem["questions"][number]["gradingMode"];
      else if (q[2] === "points") target.points = Number(r.value);
      else if (q[2] === "variants") target.acceptedVariants = r.value.split("|").filter(Boolean);
      else target.choices = r.value.split("|").filter(Boolean);
      continue;
    }
    // Table cells and data spans are positions inside generated HTML. Rewriting
    // them blind risks corrupting the markup, so they park for a human instead.
    unresolved.push({
      kind: "diff",
      path: r.path,
      a: r.value,
      note: "resolved, but this path is inside bodyHtml and is not written back automatically",
    });
  }
  return { record, unresolved };
}

export async function arbitrate(
  client: Anthropic,
  target: Target,
  flags: Flag[],
  pageImages: string[],
  pageText: string,
): Promise<Resolution[]> {
  const out: Resolution[] = [];

  for (const flag of flags) {
    const content: Anthropic.ContentBlockParam[] = [
      { type: "text", text: buildArbitrationPrompt(flag, excerptFor(flag, pageText)) },
      ...pageImages.map((p): Anthropic.ContentBlockParam => ({
        type: "image",
        source: { type: "base64", media_type: "image/png", data: readFileSync(p).toString("base64") },
      })),
    ];

    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 400,
        messages: [{ role: "user", content }],
      });
      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      out.push({ path: flag.path, value: parseArbitrationReply(text) });
    } catch (err) {
      console.error(`  arbitration failed for ${target.year}-${target.letter} ${flag.path}: ${(err as Error).message}`);
      out.push({ path: flag.path, value: null });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run and confirm the tests pass**

Run: `npm test`
Expected: PASS, 29 tests total.

- [ ] **Step 5: Commit**

```bash
npm run lint
git add scripts/ingest/arbitrate.ts tests/ingest/arbitrate.test.ts
git commit -m "Resolve disagreements with evidence neither pass had

One call per flag, carrying both candidates, the page images and the
extracted text around the value. The arbiter must pick a value or say
UNRESOLVED, and is told to prefer UNRESOLVED: a parked problem costs a
few minutes of review, a wrong answer key reaches a student.

Values inside bodyHtml are never written back automatically, since
rewriting a position in generated markup risks corrupting it."
```

---

### Task 6: Figure auto-crop (Stage 5)

**Files:**
- Create: `scripts/ingest/figures.ts`
- Test: `tests/ingest/figures.test.ts`

**Interfaces:**
- Consumes: `Target` (Task 1), `Flag` (Task 3)
- Produces:
  ```ts
  export type Region = { page: number; xPct: number; yPct: number; wPct: number; hPct: number }
  export function parseRegions(reviewNotes: string): Map<string, Region>   // asset src -> region
  export function cropCommand(file: string, region: Region, pageW: number, pageH: number, out: string): string[]
  export async function cropFigures(
    client: Anthropic, target: Target, record: Problem,
  ): Promise<{ record: Problem; flags: Flag[] }>
  ```

Figure cropping is the largest manual bottleneck in the current pipeline — the status log budgets one to two crops per problem, which at 58 problems is 60 to 120 by hand.

Coarse percentage regions plus a confirm loop are used deliberately in place of asking for precise pixel boxes, which vision models estimate poorly. Two retries, then the problem parks.

- [ ] **Step 1: Extend the drafting prompt to emit machine-readable regions**

In `scripts/ingest/draft.ts`, in `SYSTEM_BASE`, replace the sentence beginning `Describe precisely what must be cropped` with:

```
Describe what must be cropped in _reviewNotes using exactly this line format, one per figure:
CROP <asset-src> page=<n> x=<pct> y=<pct> w=<pct> h=<pct>
where the percentages are of the full page, measured from the top left, and the box is drawn generously so the whole figure plus a little margin falls inside it. Example:
CROP /content-assets/2016-open-G-signs.png page=2 x=10 y=35 w=80 h=30
```

- [ ] **Step 2: Write the failing tests**

Create `tests/ingest/figures.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRegions, cropCommand } from "../../scripts/ingest/figures";

test("parseRegions reads CROP lines into regions keyed by asset src", () => {
  const notes =
    "Keys checked against the solution.\n" +
    "CROP /content-assets/2016-open-G-signs.png page=2 x=10 y=35 w=80 h=30\n" +
    "CROP /content-assets/2016-open-G-key.png page=3 x=5 y=10 w=90 h=20\n";
  const r = parseRegions(notes);
  assert.equal(r.size, 2);
  assert.deepEqual(r.get("/content-assets/2016-open-G-signs.png"), {
    page: 2, xPct: 10, yPct: 35, wPct: 80, hPct: 30,
  });
});

test("parseRegions ignores prose and malformed lines", () => {
  assert.equal(parseRegions("Please crop the diagram on page 2.\nCROP broken line\n").size, 0);
});

test("cropCommand converts percentages to pixel arguments", () => {
  const cmd = cropCommand("pdfs/x.pdf", { page: 2, xPct: 10, yPct: 50, wPct: 80, hPct: 25 }, 1000, 1400, "/tmp/out");
  assert.ok(cmd.includes("-x")); assert.ok(cmd.includes("100"));
  assert.ok(cmd.includes("-y")); assert.ok(cmd.includes("700"));
  assert.ok(cmd.includes("-W")); assert.ok(cmd.includes("800"));
  assert.ok(cmd.includes("-H")); assert.ok(cmd.includes("350"));
  assert.ok(cmd.includes("-f")); assert.ok(cmd.includes("2"));
});

test("cropCommand clamps a box that runs off the page", () => {
  const cmd = cropCommand("pdfs/x.pdf", { page: 1, xPct: 90, yPct: 90, wPct: 40, hPct: 40 }, 1000, 1000, "/tmp/o");
  const w = Number(cmd[cmd.indexOf("-W") + 1]);
  const x = Number(cmd[cmd.indexOf("-x") + 1]);
  assert.ok(x + w <= 1000, `${x} + ${w} exceeds the page width`);
});
```

- [ ] **Step 3: Run and confirm failure**

Run: `npm test`
Expected: FAIL — cannot find `../../scripts/ingest/figures`

- [ ] **Step 4: Implement `figures.ts`**

```ts
/**
 * Stage 5 — cut the figures out of the booklet.
 *
 * This is the largest manual step in the pipeline today: roughly one to two
 * crops per problem, cut by hand. At 58 problems that is sixty to a hundred
 * and twenty of them.
 *
 * The model gives a coarse percentage box rather than a pixel-accurate one,
 * because vision models estimate precise bounding boxes badly but bracket a
 * region reliably. A confirm pass then looks at the cut image and says whether
 * it is complete, clipped, or full of stray text, and the box is widened and
 * retried. Two retries, then the problem parks.
 */

import Anthropic from "@anthropic-ai/sdk";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Problem } from "../../content/schema";
import type { Flag } from "./types";
import type { Target } from "./manifest";

const MODEL = process.env.INGEST_MODEL || "claude-opus-5";
const ASSETS_DIR = "content/assets";
const ASSETS_PREFIX = "/content-assets/";
const DPI = 200;

export type Region = { page: number; xPct: number; yPct: number; wPct: number; hPct: number };

const CROP_LINE = /^CROP\s+(\S+)\s+page=(\d+)\s+x=([\d.]+)\s+y=([\d.]+)\s+w=([\d.]+)\s+h=([\d.]+)\s*$/gm;

export function parseRegions(reviewNotes: string): Map<string, Region> {
  const out = new Map<string, Region>();
  for (const m of reviewNotes.matchAll(CROP_LINE)) {
    out.set(m[1], {
      page: Number(m[2]), xPct: Number(m[3]), yPct: Number(m[4]),
      wPct: Number(m[5]), hPct: Number(m[6]),
    });
  }
  return out;
}

export function cropCommand(
  file: string, region: Region, pageW: number, pageH: number, outBase: string,
): string[] {
  const x = Math.max(0, Math.round((region.xPct / 100) * pageW));
  const y = Math.max(0, Math.round((region.yPct / 100) * pageH));
  const w = Math.min(pageW - x, Math.round((region.wPct / 100) * pageW));
  const h = Math.min(pageH - y, Math.round((region.hPct / 100) * pageH));

  return [
    "-png", "-r", String(DPI),
    "-f", String(region.page), "-l", String(region.page),
    "-x", String(x), "-y", String(y), "-W", String(w), "-H", String(h),
    file, outBase,
  ];
}

function pageSize(file: string, page: number): { w: number; h: number } {
  const info = execFileSync("pdfinfo", ["-f", String(page), "-l", String(page), file], { encoding: "utf8" });
  const m = info.match(/Page\s+\d+\s+size:\s+([\d.]+)\s+x\s+([\d.]+)\s+pts/);
  // pdftoppm renders at DPI; pdfinfo reports points at 72 per inch.
  const scale = DPI / 72;
  if (!m) return { w: Math.round(612 * scale), h: Math.round(792 * scale) };
  return { w: Math.round(Number(m[1]) * scale), h: Math.round(Number(m[2]) * scale) };
}

/** Widens a box on each retry, since clipping is the common failure. */
function widen(r: Region): Region {
  return {
    page: r.page,
    xPct: Math.max(0, r.xPct - 6),
    yPct: Math.max(0, r.yPct - 6),
    wPct: Math.min(100, r.wPct + 12),
    hPct: Math.min(100, r.hPct + 12),
  };
}

async function confirm(client: Anthropic, imagePath: string, alt: string): Promise<string> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [{
      role: "user",
      content: [
        { type: "text", text:
          `This image was cropped from a NACLO problem booklet. It should contain: ${alt}\n\n` +
          `Reply with exactly one word:\n` +
          `COMPLETE if the whole figure is visible with nothing important cut off\n` +
          `CLIPPED if any part of the figure is cut off at an edge\n` +
          `NOISY if it is complete but includes a lot of unrelated body text` },
        { type: "image", source: {
          type: "base64", media_type: "image/png",
          data: readFileSync(imagePath).toString("base64") } },
      ],
    }],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("").trim().toUpperCase();
}

export async function cropFigures(
  client: Anthropic, target: Target, record: Problem,
): Promise<{ record: Problem; flags: Flag[] }> {
  const flags: Flag[] = [];
  const notes = String((record as unknown as { _reviewNotes?: string })._reviewNotes ?? "");
  const regions = parseRegions(notes);

  mkdirSync(ASSETS_DIR, { recursive: true });

  for (const asset of record.assets) {
    if (!asset.src.startsWith(ASSETS_PREFIX)) {
      flags.push({ kind: "figure", path: asset.src, note: `not under ${ASSETS_PREFIX}` });
      continue;
    }
    const onDisk = join(ASSETS_DIR, asset.src.slice(ASSETS_PREFIX.length));
    if (existsSync(onDisk)) continue;

    const region = regions.get(asset.src);
    if (!region) {
      flags.push({ kind: "figure", path: asset.src, note: "no CROP line in _reviewNotes" });
      continue;
    }

    // The region's page number is relative to the problem, not the booklet.
    const bookletPage = target.problem.pages[region.page - 1] ?? target.problem.pages[0];
    const size = pageSize(target.problem.file, bookletPage);

    let box = { ...region, page: bookletPage };
    let verdict = "";
    let cut = false;

    for (let attempt = 0; attempt < 3; attempt++) {
      const base = onDisk.replace(/\.png$/, "");
      execFileSync("pdftoppm", cropCommand(target.problem.file, box, size.w, size.h, base));
      const produced = [`${base}-${box.page}.png`, `${base}-0${box.page}.png`, `${base}-00${box.page}.png`, `${base}.png`]
        .find((p) => existsSync(p));
      if (!produced) break;
      if (produced !== onDisk) execFileSync("mv", [produced, onDisk]);

      verdict = await confirm(client, onDisk, asset.alt);
      if (verdict.startsWith("COMPLETE")) { cut = true; break; }
      box = widen(box);
    }

    if (!cut) {
      flags.push({
        kind: "figure", path: asset.src,
        note: `crop not confirmed after 3 attempts (last verdict: ${verdict || "none"})`,
      });
    }
  }
  return { record, flags };
}
```

- [ ] **Step 5: Run and confirm the tests pass**

Run: `npm test`
Expected: PASS, 33 tests total.

- [ ] **Step 6: Commit**

```bash
npm run lint
git add scripts/ingest/figures.ts tests/ingest/figures.test.ts scripts/ingest/draft.ts
git commit -m "Cut figures automatically, and check the cut

Roughly one to two crops per problem were being cut by hand, which at 58
problems is the largest manual step left. The model gives a coarse
percentage box rather than a pixel-accurate one, because vision models
bracket a region reliably and estimate exact boxes badly, and a confirm
pass then reports complete, clipped or noisy so the box can be widened.

Three attempts, then the problem parks."
```

---

### Task 7: Font coverage auto-extend (Stage 6)

**Files:**
- Create: `scripts/ingest/fonts.ts`
- Modify: `scripts/ingest/validate.ts` (export helpers, guard `main()`)
- Test: `tests/ingest/fonts.test.ts`

**Interfaces:**
- Consumes: `Flag` (Task 3)
- Produces:
  ```ts
  // validate.ts — newly exported
  export function coveredRanges(): Range[]
  export function uncoveredChars(text: string, ranges: Range[]): Map<string, number>
  export function allText(value: unknown): string

  // fonts.ts
  export type ScriptBlock = { name: string; family: string; lo: number; hi: number }
  export function blockOf(codepoint: number): ScriptBlock | null
  export function googleCssUrl(family: string): string
  export function parseFontFaces(css: string): { unicodeRange: string; woff2Url: string }[]
  export async function ensureCoverage(records: Problem[]): Promise<Flag[]>
  ```

An uncovered character is a hard build failure via the existing glyph gate. 2016–2022 will surface scripts not currently shipped.

No local subsetting: `fonttools` is not installed and is not being added. The 42 existing woff2 files came from the Google Fonts CSS API, which serves pre-subset woff2 slices with their `unicode-range` declarations. **The request must send a modern browser User-Agent**, or Google returns TTF instead of woff2.

- [ ] **Step 1: Make `validate.ts` importable**

In `scripts/ingest/validate.ts`, add `export` to `coveredRanges`, `uncoveredChars` and `allText`, export the `Range` type, and replace the bare `main();` call at the bottom with:

```ts
if (import.meta.url === `file://${process.argv[1]}`) main();
```

Confirm nothing broke: `npm run validate` must still print the 64-record summary line.

- [ ] **Step 2: Write the failing tests**

Create `tests/ingest/fonts.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { blockOf, googleCssUrl, parseFontFaces } from "../../scripts/ingest/fonts";

test("blockOf identifies scripts the archive uses", () => {
  assert.equal(blockOf(0x0561)?.name, "Armenian");
  assert.equal(blockOf(0x0915)?.name, "Devanagari");
  assert.equal(blockOf(0x10D0)?.name, "Georgian");
  assert.equal(blockOf(0x13A0)?.name, "Cherokee");
  assert.equal(blockOf(0x30A2)?.name, "Katakana");
});

test("blockOf returns null for an unmapped codepoint", () => {
  assert.equal(blockOf(0x1F600), null);
});

test("googleCssUrl requests a 400-weight family", () => {
  const url = googleCssUrl("Noto Sans Armenian");
  assert.ok(url.includes("family=Noto+Sans+Armenian"));
  assert.ok(url.includes("wght@400"));
});

test("parseFontFaces pairs each woff2 url with its unicode-range", () => {
  const css = `
/* armenian */
@font-face {
  font-family: 'Noto Sans Armenian';
  src: url(https://fonts.gstatic.com/s/x/v1/abc.woff2) format('woff2');
  unicode-range: U+0308, U+0530-058F, U+FB13-FB17;
}`;
  const faces = parseFontFaces(css);
  assert.equal(faces.length, 1);
  assert.equal(faces[0].woff2Url, "https://fonts.gstatic.com/s/x/v1/abc.woff2");
  assert.ok(faces[0].unicodeRange.includes("U+0530-058F"));
});

test("parseFontFaces ignores a face with no woff2 source", () => {
  assert.deepEqual(parseFontFaces("@font-face { font-family: 'X'; src: url(a.ttf) format('truetype'); }"), []);
});
```

- [ ] **Step 3: Run and confirm failure**

Run: `npm test`
Expected: FAIL — cannot find `../../scripts/ingest/fonts`

- [ ] **Step 4: Implement `fonts.ts`**

```ts
/**
 * Stage 6 — ship a font for every script the corpus uses.
 *
 * An uncovered character is a hard build failure, by design: for a problem
 * about a writing system, a tofu box removes the puzzle. 2016 to 2022 will
 * surface scripts the current subsets do not carry.
 *
 * Subsets come from the Google Fonts CSS API, which is where the 42 woff2
 * files already in public/fonts came from. It serves pre-subset slices with
 * their unicode-range declarations, so no local subsetting and no fonttools
 * dependency is needed. The request must carry a modern browser User-Agent or
 * Google returns TTF instead of woff2.
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Problem } from "../../content/schema";
import type { Flag } from "./types";
import { coveredRanges, uncoveredChars, allText } from "./validate";

const FONTS_DIR = "public/fonts";
const CSS_FILE = "app/globals.css";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export type ScriptBlock = { name: string; family: string; lo: number; hi: number };

/** Blocks NACLO problems plausibly reach for, mapped to the Noto family that covers them. */
const BLOCKS: ScriptBlock[] = [
  { name: "Greek", family: "Noto Sans", lo: 0x0370, hi: 0x03ff },
  { name: "Cyrillic", family: "Noto Sans", lo: 0x0400, hi: 0x04ff },
  { name: "Armenian", family: "Noto Sans Armenian", lo: 0x0530, hi: 0x058f },
  { name: "Hebrew", family: "Noto Sans Hebrew", lo: 0x0590, hi: 0x05ff },
  { name: "Arabic", family: "Noto Sans Arabic", lo: 0x0600, hi: 0x06ff },
  { name: "NKo", family: "Noto Sans NKo", lo: 0x07c0, hi: 0x07ff },
  { name: "Devanagari", family: "Noto Sans Devanagari", lo: 0x0900, hi: 0x097f },
  { name: "Bengali", family: "Noto Sans Bengali", lo: 0x0980, hi: 0x09ff },
  { name: "Tamil", family: "Noto Sans Tamil", lo: 0x0b80, hi: 0x0bff },
  { name: "Thai", family: "Noto Sans Thai", lo: 0x0e00, hi: 0x0e7f },
  { name: "Tibetan", family: "Noto Sans Tibetan", lo: 0x0f00, hi: 0x0fff },
  { name: "Georgian", family: "Noto Sans Georgian", lo: 0x10a0, hi: 0x10ff },
  { name: "Ethiopic", family: "Noto Sans Ethiopic", lo: 0x1200, hi: 0x137f },
  { name: "Cherokee", family: "Noto Sans Cherokee", lo: 0x13a0, hi: 0x13ff },
  { name: "Ogham", family: "Noto Sans Ogham", lo: 0x1680, hi: 0x169f },
  { name: "Runic", family: "Noto Sans Runic", lo: 0x16a0, hi: 0x16ff },
  { name: "Hiragana", family: "Noto Sans JP", lo: 0x3040, hi: 0x309f },
  { name: "Katakana", family: "Noto Sans JP", lo: 0x30a0, hi: 0x30ff },
  { name: "Hangul", family: "Noto Sans KR", lo: 0xac00, hi: 0xd7af },
  { name: "Coptic", family: "Noto Sans Coptic", lo: 0x2c80, hi: 0x2cff },
];

export function blockOf(codepoint: number): ScriptBlock | null {
  return BLOCKS.find((b) => codepoint >= b.lo && codepoint <= b.hi) ?? null;
}

export function googleCssUrl(family: string): string {
  return `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@400&display=swap`;
}

export function parseFontFaces(css: string): { unicodeRange: string; woff2Url: string }[] {
  const out: { unicodeRange: string; woff2Url: string }[] = [];
  for (const m of css.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)) {
    const body = m[1];
    const url = body.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    const range = body.match(/unicode-range:\s*([^;]+);/);
    if (url && range) out.push({ woff2Url: url[1], unicodeRange: range[1].trim() });
  }
  return out;
}

export async function ensureCoverage(records: Problem[]): Promise<Flag[]> {
  const flags: Flag[] = [];
  const ranges = coveredRanges();

  const missing = new Map<string, number>();
  for (const r of records) {
    for (const [ch, cp] of uncoveredChars(allText(r), ranges)) missing.set(ch, cp);
  }
  if (missing.size === 0) return flags;

  const families = new Map<string, ScriptBlock>();
  for (const [ch, cp] of missing) {
    const block = blockOf(cp);
    if (!block) {
      flags.push({
        kind: "font", path: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
        a: ch, note: "no Noto family is mapped for this codepoint; add one by hand",
      });
      continue;
    }
    families.set(block.family, block);
  }

  let appended = "";
  for (const [family, block] of families) {
    const res = await fetch(googleCssUrl(family), { headers: { "User-Agent": UA } });
    if (!res.ok) {
      flags.push({ kind: "font", path: family, note: `Google Fonts returned ${res.status}` });
      continue;
    }
    const faces = parseFontFaces(await res.text());
    const wanted = faces.filter((f) => f.unicodeRange.toUpperCase().includes(
      `U+${block.lo.toString(16).toUpperCase().padStart(4, "0")}`,
    ));
    const chosen = wanted.length > 0 ? wanted : faces;

    for (const [i, face] of chosen.entries()) {
      const slug = `${family.replace(/ /g, "")}-400-${block.name.toLowerCase()}${i > 0 ? `-${i}` : ""}.woff2`;
      const dest = join(FONTS_DIR, slug);
      if (!existsSync(dest)) {
        const bin = await fetch(face.woff2Url, { headers: { "User-Agent": UA } });
        if (!bin.ok) {
          flags.push({ kind: "font", path: slug, note: `woff2 download returned ${bin.status}` });
          continue;
        }
        writeFileSync(dest, Buffer.from(await bin.arrayBuffer()));
      }
      appended +=
        `\n@font-face {\n` +
        `  font-family: "${family}";\n` +
        `  font-style: normal;\n` +
        `  font-weight: 400;\n` +
        `  font-display: swap;\n` +
        `  src: url("/fonts/${slug}") format("woff2");\n` +
        `  unicode-range: ${face.unicodeRange};\n` +
        `}\n`;
      console.log(`  font: added ${slug} for ${block.name}`);
    }
  }

  if (appended) {
    writeFileSync(CSS_FILE, readFileSync(CSS_FILE, "utf8") + appended);
    console.log(`  font: appended ${families.size} family declaration(s) to ${CSS_FILE}`);
    console.log(`  font: add these families to the --data-stack variable by hand if the data should prefer them`);
  }
  return flags;
}
```

- [ ] **Step 5: Run and confirm the tests pass**

Run: `npm test`
Expected: PASS, 38 tests total.

- [ ] **Step 6: Verify the API still serves woff2**

```bash
curl -sH 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' \
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Armenian:wght@400&display=swap' | head -20
```

Expected: `@font-face` blocks with `.woff2` urls and `unicode-range` lines. If they are `.ttf`, the User-Agent constant needs updating before this stage can work.

- [ ] **Step 7: Commit**

```bash
npm run lint && npm run validate
git add scripts/ingest/fonts.ts scripts/ingest/validate.ts tests/ingest/fonts.test.ts
git commit -m "Fetch a font subset for any script the corpus introduces

An uncovered character fails the build on purpose: in a problem about a
writing system, a tofu box removes the puzzle. Seven new years will
surface scripts the current subsets do not carry.

Subsets come from the Google Fonts CSS API, which is where the existing
42 woff2 files came from, so there is no local subsetting and no new
dependency. Anything with no mapped family is reported and parks."
```

---

### Task 8: Publish or park, and the run report (Stage 7)

**Files:**
- Create: `scripts/ingest/publish.ts`
- Test: `tests/ingest/publish.test.ts`

**Interfaces:**
- Consumes: `Flag` (Task 3)
- Produces:
  ```ts
  export type Outcome = {
    id: string
    status: "published" | "parked"
    flags: Flag[]
    questionCount: number
  }
  export function hintsLeakAnswers(record: Problem): Flag[]
  export function decide(record: Problem, flags: Flag[]): Outcome
  export function writeRecord(o: Outcome, record: Problem): string   // returns the path written
  export function renderReport(outcomes: Outcome[], dateIso: string): string
  ```

Park is the default failure mode. A problem the pipeline cannot vouch for reaches the queue, never a student.

This task also carries the one constraint the spec assigns to hints. Hints and explanations are generated once rather than cross-checked, since two passes never word prose alike; what replaces consensus for them is that a hint must not simply hand over a graded answer. The other two hint constraints are already enforced elsewhere: exactly three tiers by the schema's `superRefine`, and glyph coverage by Stage 6.

- [ ] **Step 1: Write the failing tests**

Create `tests/ingest/publish.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, renderReport } from "../../scripts/ingest/publish";
import type { Problem } from "../../content/schema";
import type { Flag } from "../../scripts/ingest/types";

function record(over: Partial<Problem> = {}): Problem {
  return {
    id: "2016-open-A", tier: "full", year: 2016, round: "open", letter: "A",
    title: "T", authors: ["X"], sourcePdfUrl: "https://naclo.org/practice.php",
    conceptTags: ["morphology"], formTag: "rosetta-stone", difficulty: "intro",
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
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test`
Expected: FAIL — cannot find `../../scripts/ingest/publish`

- [ ] **Step 3: Implement `publish.ts`**

```ts
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
```

- [ ] **Step 4: Run and confirm the tests pass**

Run: `npm test`
Expected: PASS, 45 tests total.

- [ ] **Step 5: Make `content/parked/` committed**

Add to `.gitignore`, directly below the existing `/content/drafts` block:

```
# NOTE: content/parked is deliberately NOT ignored. It is the review queue for
# problems the pipeline could not vouch for, and it is meant to be read in a
# diff. lib/content.ts never loads it, so nothing in it can reach a student.
```

Then: `mkdir -p content/parked && touch content/parked/.gitkeep`

- [ ] **Step 6: Commit**

```bash
npm run lint
git add scripts/ingest/publish.ts tests/ingest/publish.test.ts .gitignore content/parked/.gitkeep
git commit -m "Publish only what every gate cleared, park the rest

Park is the default failure mode: a record publishes when there are no
flags and it parses as published, and anything else lands in
content/parked with its reasons attached.

content/parked is committed on purpose. It is the queue for later human
passes and it is meant to be read in a diff, and lib/content.ts loads
neither it nor drafts, so nothing in either can reach a student."
```

---

### Task 9: Orchestrator and the first live run

**Files:**
- Create: `scripts/ingest/run.ts`
- Modify: `package.json` (add `ingest` script)

**Interfaces:**
- Consumes: everything from Tasks 1–8

- [ ] **Step 1: Implement `run.ts`**

```ts
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
    if (flags.length > 0 && target.hasTextLayer) {
      const images = renderForArbitration(target, workDir);
      const pages = readText(target.problem.file).split("\f");
      const scope = target.problem.pages.map((p) => pages[p - 1] ?? "").join("\n");
      const resolutions = await arbitrate(client, target, flags, images, scope);
      const applied = applyResolutions(record, resolutions);
      record = applied.record;
      flags = applied.unresolved;
    } else if (flags.length > 0) {
      flags.push({
        kind: "diff", path: "(arbitration)",
        note: "skipped: this booklet has no text layer, so there is no independent evidence to arbitrate against",
      });
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
  const results = await mapPool(manifest, 4, (t) => processOne(client, t));
  const outcomes = results.filter((o): o is Outcome => o !== null);

  // Stage 6 — fonts, over everything that published this run.
  const publishedRecords = outcomes
    .filter((o) => o.status === "published")
    .map((o) => Problem.parse(JSON.parse(readFileSync(`content/problems/${o.id}.json`, "utf8"))));
  const fontFlags = await ensureCoverage(publishedRecords);
  if (fontFlags.length > 0) {
    console.warn(`\n${fontFlags.length} font issue(s) — the affected problems need a subset by hand:`);
    for (const f of fontFlags) console.warn(`  ${f.path} ${f.a ?? ""} — ${f.note}`);
  }

  const date = new Date().toISOString().slice(0, 10);
  mkdirSync("docs/ingest-runs", { recursive: true });
  const reportPath = `docs/ingest-runs/${date}.md`;
  writeFileSync(reportPath, renderReport(outcomes, date));

  const published = outcomes.filter((o) => o.status === "published").length;
  console.log(`\n${published} published, ${outcomes.length - published} parked. Report: ${reportPath}`);
  console.log(`Now run: npm run validate`);
}

main();
```

- [ ] **Step 2: Add the npm script**

In `package.json`, add to `"scripts"`:

```json
"ingest": "tsx scripts/ingest/run.ts"
```

- [ ] **Step 3: Dry-run the manifest**

Run: `npm run ingest -- --all --dry`

Expected: 58 rows. Every non-2019 row has a numeric `pts=` and `authors>=1`; 2019's eight rows show `NO TEXT LAYER`.

- [ ] **Step 4: End-to-end on one problem**

```bash
npx tsx scripts/ingest/draft.ts 2016-A
npm run ingest -- 2016
```

Expected: a per-problem status line for each of 2016 A–H, a report at `docs/ingest-runs/<today>.md`, and every problem either in `content/problems/` or `content/parked/`. Read the report before going further — it is the first real evidence of how the gates behave.

- [ ] **Step 5: Validate and build**

```bash
npm run validate
npm run build
```

Expected: `validate` reports the new record count with no errors. If it fails on glyph coverage, stage 6 could not map a script; add the family to `BLOCKS` in `fonts.ts` and re-run `npm run ingest -- 2016`.

- [ ] **Step 6: Commit the code, then the content separately**

Per repo etiquette, content records go in their own commit.

```bash
npm run lint
git add scripts/ingest/run.ts package.json
git commit -m "Run the whole pipeline with one command

Stages 0 to 7 in order, four problems at a time, resuming from existing
drafts so an interrupted run does not pay twice. Writes a dated run
report naming every parked problem and why."

git add content/problems content/parked docs/ingest-runs public/fonts app/globals.css
git commit -m "Publish NACLO 2016 Open Round

Drafted twice and cross-checked against the booklet text layer. See
docs/ingest-runs/ for what parked and why."
```

- [ ] **Step 7: Run the remaining years**

```bash
npx tsx scripts/ingest/draft.ts 2017 2018 2019 2020 2021 2022
npm run ingest -- 2017 2018 2019 2020 2021 2022
npm run validate && npm run build
```

Expected: about 50 further problems attempted. Read the report. Commit content separately from code as above.

---

### Task 10: Reconcile the copy and the docs

**Files:**
- Modify: `app/page.tsx:60-63`, `CLAUDE.md`, `PRODUCT.md`, `docs/architecture.md`, `docs/changelog.md`, `docs/project_status.md`

The home page currently promises every problem was "checked by a person," which stops being true for 58 of 88. This task makes the claim match what the pipeline does.

- [ ] **Step 1: Fix the home page guarantee**

In `app/page.tsx`, replace the paragraph at lines 60–63:

```tsx
      <p className="mt-4 max-w-[58ch] text-[0.85rem] leading-relaxed text-ink-soft">
        Every problem is transcribed twice and cross-checked against
        NACLO&rsquo;s official solutions before it goes up. Found a mistake? Every
        answer can be flagged.
      </p>
```

Check against the brand rules in `PRODUCT.md`: US spelling, no em dashes.

- [ ] **Step 2: Update `CLAUDE.md`'s content-integrity rules**

Replace the bullet reading `Only \`published\` records ship; unreviewed AI drafts never reach a student` with:

```markdown
- Only `published` records ship. A record publishes when two independent
  transcription passes agree, the booklet's own text layer confirms the
  language data, and `validate.ts` is clean. Anything else parks in
  `content/parked/`, which the site never loads
- Human review is no longer on the publish path. It is a follow-on pass over
  the parked queue and over student flags
```

While there, fix the stale architecture tree noted in the project docs: `question-card.tsx` is now `question-row.tsx`, `hint-ladder.tsx` is now `help-popover.tsx`, `timer.tsx` is now `practice-timer.tsx`, and `app/api/help/` is missing entirely.

- [ ] **Step 3: Update `PRODUCT.md`**

Replace `Content is authored offline and reviewed by a person before it ships.
Drafting is assisted by a model; publishing is a human act.` with:

```markdown
Content is authored offline. Each problem is transcribed twice by a model, and
the two passes are cross-checked against each other and against the booklet's
own text layer before publishing. Problems the checks cannot settle are parked
for a person rather than published.
```

Update the capabilities counts from 30 playable / 34 catalogue to whatever
`npm run validate` reports after Task 9. Do not invent the numbers, read them.

- [ ] **Step 4: Update `docs/architecture.md`**

Replace the whole "### Ingest — offline" fenced block with:

````markdown
### Ingest — offline (`npm run draft` then `npm run ingest`)
```
problem PDF + solution PDF        → /pdfs (gitignored), downloaded by hand
   ↓  manifest.ts                 → pages, title, points, bylines read straight
                                    out of the text layer, then pinned
   ↓  draft.ts                    → two passes: 150dpi cell-by-cell, 300dpi
                                    holistic → content/drafts/<id>.{a,b}.json
   ↓  diff.ts                     → the two passes compared on fact only
   ↓  witness.ts                  → language data checked against pdftotext
                                    (skipped for 2019, whose booklets are
                                    mojibake)
   ↓  arbitrate.ts                → one model call per disagreement, with the
                                    page crop and the extracted text. Never
                                    run for 2019: no independent evidence
   ↓  figures.ts                  → coarse box → crop → confirm → widen, 3x
   ↓  fonts.ts                    → uncovered codepoints → Noto subset from
                                    the Google Fonts CSS API
   ↓  publish.ts                  → every gate green → content/problems/,
                                    reviewStatus 'published'
                                    otherwise → content/parked/ with reasons
   ↓  validate.ts                 → Zod + assets + keys + glyph coverage.
                                    Blocks the build
   ↓  sync-assets.ts              → content/assets → public/content-assets
```

Human review is no longer on the publish path. It is a follow-on pass over
`content/parked/` and over student flags. A dated report of each run lives in
`docs/ingest-runs/`.
````

Then in the "Content & Ingest" section, add after the `content/problems/*.json` bullet:

```markdown
- `content/parked/*.json` — problems the pipeline could not vouch for, with a
  `_parkReasons` array. Committed on purpose: it is the queue for human review
  and is meant to be read in a diff. `lib/content.ts` reads neither it nor
  `content/drafts/`, so nothing in either can reach a student
```

- [ ] **Step 5: Update the changelog and project status**

Add to `docs/changelog.md` under `### Added` and `### Changed`, and add a dated entry to `docs/project_status.md` recording what was published, what parked, what the run cost, and what is left. Follow the existing style in both files: specific, and honest about what went wrong.

- [ ] **Step 6: Verify and commit**

```bash
npm run lint && npm run validate && npm run build
git add app/page.tsx CLAUDE.md PRODUCT.md docs/
git commit -m "Say what the pipeline actually does

The home page promised every problem was checked by a person, which
stops being true for 58 of 88. It now claims what the pipeline earns:
transcribed twice, cross-checked against the official solutions.

Also reconciles CLAUDE.md's content-integrity rules and its stale
architecture tree, which still named three components that were renamed
and omitted /api/help entirely."
```

---

## Verification

After Task 10 the following must all hold:

1. `npm test` — 45 tests pass.
2. `npm run lint` — clean.
3. `npm run validate` — no errors; record count and sub-question count reflect the new corpus.
4. `npm run build` — succeeds.
5. `npm run dev`, then open `localhost:3000/practice` — the new problems are listed and filterable, and opening one renders its tables and data without tofu boxes.
6. `git status` — `content/drafts/` is untracked; `content/parked/` is tracked.
7. `docs/ingest-runs/<date>.md` exists and names every parked problem with a reason.
8. Spot-check three published problems against their booklet PDFs by eye, one of them figure-bearing. This is the last thing standing between the pipeline's judgment and a student, and it is worth twenty minutes.
