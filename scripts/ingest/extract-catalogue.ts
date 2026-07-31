/**
 * Pulls the mechanical fields out of a full NACLO exam booklet: letter, title,
 * points, page span, and author.
 *
 * This is the cheap half of ingestion. It cannot produce concept tags or a
 * transcription — those need a person reading the problem. What it gives you is
 * a catalogue entry: enough to find a problem and link out to the original.
 *
 * Usage: tsx scripts/ingest/extract-catalogue.ts
 */

import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

type Extracted = {
  year: number;
  letter: string;
  title: string;
  points: number;
  pages: number;
  authors: string[];
  snippet: string;
};

const EXAMS: { file: string; year: number }[] = [
  { file: "pdfs/NACLO2018ROUND1.pdf", year: 2018 },
  { file: "pdfs/NACLO2019ROUND1.pdf", year: 2019 },
  { file: "pdfs/NACLO2020ROUND1.pdf", year: 2020 },
  { file: "pdfs/NACLO2021ROUND1.pdf", year: 2021 },
  { file: "pdfs/NACLO2022ROUND1.pdf", year: 2022 },
  { file: "pdfs/NACLO2023ROUND1.pdf", year: 2023 },
  { file: "pdfs/naclo-2024-problems.pdf", year: 2024 },
  { file: "pdfs/naclo-2025-problems.pdf", year: 2025 },
];

// "(A) The Way We Were (1/4) [15 Points]"
const HEADER = /\(([A-Z])\)\s+(.+?)\s+\(1\/(\d+)\)\s*\[(\d+)\s*[Pp]oints?\]/;
const COPYRIGHT = /©\s*\d{4},?\s*([^,]+?),\s*North American/;

function pdfText(file: string): string {
  return execFileSync("pdftotext", [file, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function extract(file: string, year: number): Extracted[] {
  if (!existsSync(file)) {
    console.warn(`  missing: ${file}`);
    return [];
  }
  const pages = pdfText(file).split("\f");
  const out: Extracted[] = [];

  pages.forEach((page, i) => {
    const m = page.match(HEADER);
    if (!m) return;
    const [, letter, rawTitle, span, points] = m;

    // Authors sit in the copyright line, usually on the problem's last page.
    const authors = new Set<string>();
    for (let j = i; j < Math.min(i + Number(span), pages.length); j++) {
      const c = pages[j].match(COPYRIGHT);
      if (c) {
        for (const name of c[1].split(/\s*&\s*|\s+and\s+/)) {
          const trimmed = name.trim();
          if (trimmed) authors.add(trimmed);
        }
      }
    }

    const snippet = pages[i]
      .replace(HEADER, "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 30)
      .slice(0, 4)
      .join(" ")
      .slice(0, 420);

    out.push({
      year,
      letter,
      title: rawTitle.replace(/\s+/g, " ").trim(),
      points: Number(points),
      pages: Number(span),
      authors: [...authors],
      snippet,
    });
  });

  return out;
}

const all: Extracted[] = [];
for (const { file, year } of EXAMS) {
  const found = extract(file, year);
  console.log(`${year}: ${found.length} problems`);
  all.push(...found);
}

writeFileSync("/tmp/catalogue-raw.json", JSON.stringify(all, null, 2));
console.log(`\n${all.length} problems -> /tmp/catalogue-raw.json`);
