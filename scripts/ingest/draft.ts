/**
 * The batch drafting pipeline — the `draft` step from the spec's content
 * pipeline, finally implemented.
 *
 * For each requested problem it renders the problem pages and the matching
 * solution pages to images, sends them to the Claude API, and writes the
 * returned record to content/drafts/<id>.json with reviewStatus "drafted".
 *
 * Drafts NEVER land in content/problems/ — the site serves only published
 * records from there, and promotion is a human act: review the draft, fix
 * what is wrong, move the file over, flip reviewStatus. The quality gate
 * stays where the spec put it.
 *
 * Usage:
 *   tsx scripts/ingest/draft.ts --list            # show the manifest, no API calls
 *   tsx scripts/ingest/draft.ts 2024-B            # draft one problem
 *   tsx scripts/ingest/draft.ts 2024              # draft a whole year
 *   tsx scripts/ingest/draft.ts --all             # draft everything not already done
 */

import Anthropic from "@anthropic-ai/sdk";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Problem } from "../../content/schema";
import { CONCEPT_TAGS, FORM_TAGS } from "../../content/taxonomy";

/* ---------------------------------------------------------------------------
   Environment. tsx does not auto-load .env.
   --------------------------------------------------------------------------- */

function loadEnv() {
  if (!existsSync(".env")) return;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
  }
}
loadEnv();

const MODEL = process.env.INGEST_MODEL || "claude-opus-5";

/* ---------------------------------------------------------------------------
   Manifest: which pages hold which problem, per booklet.
   Derived from pdftotext where the text layer is sound; 2019's is mojibake
   (and 2023's solutions), so those carry hand-checked page maps.
   --------------------------------------------------------------------------- */

type Booklet = { file: string; pages: number[] };
type Target = { year: number; letter: string; title: string; problem: Booklet; solution?: Booklet };

const EXAMS: Record<number, { problems: string; solutions: string }> = {
  2018: { problems: "pdfs/NACLO2018ROUND1.pdf", solutions: "pdfs/NACLO2018ROUND1SOL.pdf" },
  2019: { problems: "pdfs/NACLO2019ROUND1.pdf", solutions: "pdfs/NACLO2019ROUND1SOL.pdf" },
  2020: { problems: "pdfs/NACLO2020ROUND1.pdf", solutions: "pdfs/NACLO2020ROUND1SOL.pdf" },
  2021: { problems: "pdfs/NACLO2021ROUND1.pdf", solutions: "pdfs/NACLO2021ROUND1SOL.pdf" },
  2022: { problems: "pdfs/NACLO2022ROUND1.pdf", solutions: "pdfs/NACLO2022ROUND1SOL.pdf" },
  2023: { problems: "pdfs/NACLO2023ROUND1.pdf", solutions: "pdfs/NACLO2023ROUND1SOL.pdf" },
  2024: { problems: "pdfs/naclo-2024-problems.pdf", solutions: "pdfs/naclo-2024-solutions.pdf" },
  2025: { problems: "pdfs/naclo-2025-problems.pdf", solutions: "pdfs/naclo-2025-solutions.pdf" },
};

// Hand-checked page maps for booklets whose embedded text is mojibake.
//
// 2023 solutions verified by rendering each page. Both 2019 booklets embed a
// subsetted font with a broken ToUnicode map, so pdftotext returns a
// substitution cipher — but a consistent one, and the header furniture
// survives it: "(" is U+037E, ")" is U+037F, and a digit d is U+03EC+d. That
// leaves "(X)" and "(n/m)" findable without decoding a word of the prose.
// Scanning both booklets for that shape turns up exactly eight letter glyphs
// (U+0004, U+0011, U+0012, U+0018, U+001C, U+0026, U+0027, U+002C) in the
// same order in each, which pins them to A-H. Pages below are that scan, with
// the (n/m) counts agreeing on every span. The end-of-booklet answer sheet
// (problems p24-29, its own "1/6".."6/6") is excluded.
const MANUAL_PAGES: Record<string, Record<string, number[]>> = {
  "pdfs/NACLO2023ROUND1SOL.pdf": {
    A: [1, 2], B: [3], C: [4, 5], D: [6, 7], E: [8], F: [9], G: [10, 11, 12, 13], H: [14],
  },
  "pdfs/NACLO2019ROUND1.pdf": {
    A: [8, 9], B: [10], C: [11], D: [12, 13, 14], E: [15], F: [16, 17], G: [18, 19], H: [20, 21],
  },
  "pdfs/NACLO2019ROUND1SOL.pdf": {
    A: [2], B: [3], C: [4], D: [5], E: [6], F: [7], G: [8], H: [9],
  },
};

const HEADER = /\(([A-Z])\)\s+(.+?)\s+\((\d+)\/(\d+)\)/;

function mapBooklet(file: string): { pages: Map<string, number[]>; titles: Map<string, string> } {
  const pages = new Map<string, number[]>();
  const titles = new Map<string, string>();

  const manual = MANUAL_PAGES[file];
  if (manual) {
    for (const [letter, pp] of Object.entries(manual)) pages.set(letter, pp);
    return { pages, titles };
  }

  const text = execFileSync("pdftotext", [file, "-"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const pageTexts = text.split("\f");
  pageTexts.forEach((page, i) => {
    const m = page.match(HEADER);
    if (!m) return;
    const [, letter, title] = m;
    if (!pages.has(letter)) pages.set(letter, []);
    pages.get(letter)!.push(i + 1);
    if (!titles.has(letter)) titles.set(letter, title.replace(/\s+/g, " ").trim());
  });

  // Fallback for solutions booklets with bare "(A) Title" headers and no
  // (1/1) pagination — e.g. 2024. Each letter spans from its header page to
  // the next letter's header page (inclusive: several solutions share pages).
  if (pages.size === 0) {
    const headers: { letter: string; page: number }[] = [];
    pageTexts.forEach((page, i) => {
      for (const m of page.matchAll(/^\(([A-Z])\)\s+\S/gm) as Iterable<RegExpMatchArray>) {
        headers.push({ letter: m[1], page: i + 1 });
      }
    });
    headers.forEach((h, idx) => {
      const end = idx + 1 < headers.length ? headers[idx + 1].page : pageTexts.length - 1;
      const span: number[] = [];
      for (let p = h.page; p <= Math.max(h.page, end); p++) span.push(p);
      if (!pages.has(h.letter)) pages.set(h.letter, span);
    });
  }
  return { pages, titles };
}

function buildManifest(): Target[] {
  const targets: Target[] = [];
  for (const [yearStr, files] of Object.entries(EXAMS)) {
    const year = Number(yearStr);
    if (!existsSync(files.problems)) continue;

    const prob = mapBooklet(files.problems);
    if (prob.pages.size === 0) {
      console.warn(`  ${year}: no problems found (broken text layer?) — needs a manual page map`);
      continue;
    }
    const sol = existsSync(files.solutions)
      ? mapBooklet(files.solutions)
      : { pages: new Map<string, number[]>(), titles: new Map<string, string>() };

    for (const [letter, pp] of [...prob.pages.entries()].sort()) {
      targets.push({
        year,
        letter,
        title: prob.titles.get(letter) ?? "(title unknown)",
        problem: { file: files.problems, pages: pp },
        solution: sol.pages.has(letter)
          ? { file: files.solutions, pages: sol.pages.get(letter)! }
          : undefined,
      });
    }
  }
  return targets;
}

/* ---------------------------------------------------------------------------
   Rendering
   --------------------------------------------------------------------------- */

function renderPages(file: string, pages: number[], dir: string, prefix: string): string[] {
  const out: string[] = [];
  for (const page of pages) {
    const base = join(dir, `${prefix}-${page}`);
    execFileSync("pdftoppm", ["-png", "-r", "150", "-f", String(page), "-l", String(page), file, base]);
    // pdftoppm zero-pads the page suffix depending on total page count
    for (const suffix of [`-${page}.png`, `-${String(page).padStart(2, "0")}.png`, `-${String(page).padStart(3, "0")}.png`]) {
      if (existsSync(base + suffix)) {
        out.push(base + suffix);
        break;
      }
    }
  }
  return out;
}

/* ---------------------------------------------------------------------------
   The drafting prompt
   --------------------------------------------------------------------------- */

const SYSTEM = `You transcribe NACLO linguistics olympiad problems into structured JSON records for a practice site. You are given page images of one problem and, when available, its official solution. Accuracy is everything: a wrong answer key or a broken table alignment makes the problem unsolvable, and a human reviewer will check your work cell by cell.

Return ONLY a JSON object, no markdown fences, matching this shape:

{
  "id": "<year>-open-<letter>",
  "tier": "full",
  "year": <number>, "round": "open", "letter": "<letter>",
  "title": "<exact title from the header>",
  "authors": ["<from the copyright line if visible, else 'NACLO <year> Problem Committee'>"],
  "sourcePdfUrl": "https://naclo.org/practice.php",
  "conceptTags": [<1-3 from: ${CONCEPT_TAGS.map((t) => `"${t}"`).join(", ")}>],
  "formTag": <one of: ${FORM_TAGS.map((t) => `"${t}"`).join(", ")}>,
  "difficulty": <"intro" if <=5 official points, "standard" if <=10, "hard" otherwise>,
  "languages": [<natural languages featured, [] for invented/formal ones>],
  "officialPoints": <from the header>,
  "officialTimeMinutes": <round(points * 1.8), min 10>,
  "bodyHtml": "<the problem text as HTML>",
  "assets": [],
  "questions": [<one per sub-answer the student writes>],
  "hints": [<exactly 3>],
  "explanationHtml": "<the walkthrough as HTML>",
  "reviewStatus": "drafted",
  "_reviewNotes": "<anything the human reviewer must check or crop — see below>"
}

TRANSCRIPTION RULES
- Prose becomes clean HTML paragraphs. Preserve every piece of language data exactly: diacritics, apostrophes, unusual letters. Never "correct" spelling in a language you do not know.
- In YOUR OWN prose (hints, explanation, prompts) use only ASCII plus curly quotes, en/em dashes and the ellipsis. No arrows (→ ⇒), no maths symbols, no emoji: the self-hosted fonts do not carry them and the build fails on an uncovered character. Write "gives", "becomes" or "takes" where you would reach for an arrow. This limit does NOT apply to transcribed language data — a script the problem is actually about is expected, and gets a font subset added for it.
- Data tables become real <table> markup wrapped in <div class="table-scroll">. Alignment IS the puzzle: transcribe cell by cell.
- Paired translation lists (word — gloss) become <dl class="gloss-list"><dt>word</dt><dd>gloss</dd>...</dl>.
- Wrap every span of non-English language data in class="data": <span class="data">word</span>, or <dt> content (already styled).
- Where the booklet prints a BLANK for the student to fill in — an empty table cell labelled "(a)" or "a.", or a gap like "_____(a)_____" inside a sentence — do not transcribe the label. Put an answer slot there instead: <span class="blank" data-q="A2.a"></span>, naming the question whose input belongs in that spot. The site renders the real input inside the slot, so the student answers where the booklet asks. Every slot must name a question that exists, and no question may have two slots; the build fails otherwise. Row numbers ("1.", "2.") and option labels the student only refers to are NOT blanks and stay as text.
- If part of the problem is a figure, glyph specimen, kinship tree, or drawing that cannot be expressed as text or a table, do NOT attempt ASCII art. Describe precisely what must be cropped (page and location) in _reviewNotes, reference it in bodyHtml as <figure><img src="/content-assets/<id>-<name>.png" alt="<alt text>" /></figure>, and add the same src/alt to assets. The reviewer will crop it.

QUESTIONS
- One entry per blank the student fills: {"id","part","partPrompt","promptHtml","gradingMode","answerKey","acceptedVariants","points"} plus optional "choices".
- "part" groups sub-questions (e.g. "B1"); put the instruction in "partPrompt" on the FIRST question of the part only.
- "id" is always "<part>.<label>" — the part, a dot, then the label the booklet itself uses for that blank: "B1.a", "B3.iv", "A2.7". Never invent a scheme of your own, and never lowercase the part.
- acceptedVariants exist for genuinely different answers, not typography: grading already ignores case, surrounding whitespace and trailing . ! ? on both sides. Do not list a variant that differs only by those.
- gradingMode "exact" for anything with a single checkable answer (letters, words, numbers, matching, table cells). Add reasonable acceptedVariants (letter-only for lettered matches, missing diacritics a US keyboard cannot type). Use "choices" when the problem gives a fixed option set.
- gradingMode "llm" ONLY for free-text translation where several wordings are correct. Prefer exact wherever defensible.
- Never use gradingMode "self".
- Distribute officialPoints across questions using the official per-part breakdown when the solution shows one, else evenly.
- Every answerKey comes from the OFFICIAL solution pages. If no solution images were provided, solve the problem yourself, set every affected question's answerKey normally, and state prominently in _reviewNotes that keys are unofficial and must be verified.

PLAIN TEXT vs HTML — only the fields whose names end in Html are rendered as HTML. "text", "partPrompt", "rubric", "answerKey" and "choices" are rendered as plain text, so a <span> or an &nbsp; in one of them reaches the student as literal angle brackets. Write those fields with plain characters only; the language data in them is still safe to write directly, because the UI font stack covers every script the fonts do.

HINTS — exactly 3, each shaped {"tier": <1|2|3>, "text": "...", "xpCost": <n>} with xpCost 1/2/3 (or 2/3/4 for 15-point problems):
1. Orientation: where to look. 2. Method: the insight, stated but not applied. 3. Partial work: ONE step worked through on data that is NOT one of the graded questions. Never reveal an answer.

EXPLANATION — a genuine walkthrough for a 12-17 year old: the path a solver takes, not just the answers. Use <h3> section headers, work concrete examples, and gloss any linguistics term in plain English. This is the main thing the site adds over the PDF.`;

/* ---------------------------------------------------------------------------
   Drafting
   --------------------------------------------------------------------------- */

async function draftOne(client: Anthropic, target: Target, force: boolean): Promise<"done" | "skipped" | "failed"> {
  const id = `${target.year}-open-${target.letter}`;
  const draftPath = `content/drafts/${id}.json`;

  if (existsSync(`content/problems/${id}.json`)) {
    const existing = JSON.parse(readFileSync(`content/problems/${id}.json`, "utf8"));
    if (existing.tier === "full") {
      console.log(`  ${id}: already fully transcribed — skipping`);
      return "skipped";
    }
  }
  if (existsSync(draftPath) && !force) {
    console.log(`  ${id}: draft exists — skipping (use --force to redo)`);
    return "skipped";
  }

  const workDir = join(tmpdir(), `gloss-draft-${id}`);
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });

  try {
    const problemImages = renderPages(target.problem.file, target.problem.pages, workDir, "p");
    const solutionImages = target.solution
      ? renderPages(target.solution.file, target.solution.pages, workDir, "s")
      : [];

    const content: Anthropic.ContentBlockParam[] = [
      {
        type: "text",
        text:
          `Problem (${target.year} Open Round, letter ${target.letter}): ${problemImages.length} page(s)` +
          (solutionImages.length
            ? `, followed by the official solution: ${solutionImages.length} page(s).`
            : `. NO official solution is available — solve it yourself and flag the keys as unofficial in _reviewNotes.`),
      },
      ...problemImages.map(
        (p): Anthropic.ContentBlockParam => ({
          type: "image",
          source: { type: "base64", media_type: "image/png", data: readFileSync(p).toString("base64") },
        }),
      ),
      ...(solutionImages.length
        ? [{ type: "text" as const, text: "Official solution pages follow:" }]
        : []),
      ...solutionImages.map(
        (p): Anthropic.ContentBlockParam => ({
          type: "image",
          source: { type: "base64", media_type: "image/png", data: readFileSync(p).toString("base64") },
        }),
      ),
    ];

    // Streaming: structured JSON for a whole problem routinely exceeds the
    // non-streaming max_tokens comfort zone.
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });
    const response = await stream.finalMessage();

    if (response.stop_reason === "refusal") {
      console.error(`  ${id}: model declined the request — skipping`);
      return "failed";
    }
    if (response.stop_reason === "max_tokens") {
      console.error(`  ${id}: output truncated at max_tokens — raise it and retry`);
      return "failed";
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "");

    let record: unknown;
    try {
      record = JSON.parse(text);
    } catch {
      writeFileSync(`${draftPath}.rejected`, text);
      console.error(`  ${id}: response was not valid JSON — raw output kept at ${draftPath}.rejected`);
      return "failed";
    }

    // Pin the fields the model must not control.
    const pinned = {
      ...(record as Record<string, unknown>),
      id,
      tier: "full",
      year: target.year,
      round: "open",
      letter: target.letter,
      sourcePdfUrl: "https://naclo.org/practice.php",
      reviewStatus: "drafted",
    };

    const parsed = Problem.safeParse(pinned);
    mkdirSync("content/drafts", { recursive: true });
    writeFileSync(draftPath, JSON.stringify(pinned, null, 2) + "\n");

    const tokens = `${response.usage.input_tokens}in/${response.usage.output_tokens}out`;
    if (parsed.success) {
      console.log(`  ${id}: drafted (${(pinned as unknown as { questions?: unknown[] }).questions?.length ?? "?"} questions, ${tokens})`);
    } else {
      console.warn(`  ${id}: drafted with ${parsed.error.issues.length} schema issue(s) to fix in review (${tokens}):`);
      for (const issue of parsed.error.issues.slice(0, 5)) {
        console.warn(`      ${issue.path.join(".")}: ${issue.message}`);
      }
    }
    return "done";
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

/* --------------------------------------------------------------------------- */

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const wants = args.filter((a) => !a.startsWith("--"));

  const manifest = buildManifest();

  if (args.includes("--list") || (wants.length === 0 && !args.includes("--all"))) {
    console.log("Draftable problems (problem pages + solution pages):\n");
    for (const t of manifest) {
      const sol = t.solution ? `sol p${t.solution.pages.join(",")}` : "NO SOLUTION FOUND";
      console.log(
        `  ${t.year}-${t.letter}  ${t.title.slice(0, 42).padEnd(44)} p${t.problem.pages.join(",")}  ${sol}`,
      );
    }
    console.log(`\n${manifest.length} problems. Run with an id (2024-B), a year (2024), or --all.`);
    return;
  }

  const selected = manifest.filter((t) => {
    if (args.includes("--all")) return true;
    return wants.some((w) => w === String(t.year) || w.toUpperCase() === `${t.year}-${t.letter}`);
  });

  if (selected.length === 0) {
    console.error("Nothing matched. Use --list to see what is available.");
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set (checked env and .env).");
    process.exit(1);
  }

  const client = new Anthropic();
  console.log(`Drafting ${selected.length} problem(s) with ${MODEL} -> content/drafts/\n`);

  let done = 0, skipped = 0, failed = 0;
  for (const target of selected) {
    try {
      const result = await draftOne(client, target, force);
      if (result === "done") done += 1;
      else if (result === "skipped") skipped += 1;
      else failed += 1;
    } catch (err) {
      failed += 1;
      if (err instanceof Anthropic.RateLimitError) {
        console.error(`  ${target.year}-${target.letter}: rate limited — waiting 60s`);
        await new Promise((r) => setTimeout(r, 60_000));
      } else if (err instanceof Anthropic.APIError) {
        console.error(`  ${target.year}-${target.letter}: API error ${err.status}: ${err.message}`);
      } else {
        console.error(`  ${target.year}-${target.letter}: ${(err as Error).message}`);
      }
    }
  }

  console.log(`\n${done} drafted, ${skipped} skipped, ${failed} failed.`);
  if (done > 0) {
    console.log("Drafts are in content/drafts/ — review, fix, then move to content/problems/ with reviewStatus published.");
  }
}

main();
