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
/** Case-varies across years, and inside 2021's own booklet: match both "points" and "Points". */
const POINTS = /\(([A-Z])\)\s+.+?\s+\(1\/\d+\)\s*\[(\d+)\s*[Pp]oints?\]/g;
const AUTHOR_LABELLED = /^Problem ([A-Z]):\s*([^\n\f]+)/gm;
const AUTHOR_PARENTHESISED = /^\(([A-Z])\)\s+([A-Z][^\n\f]*)$/gm;

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
