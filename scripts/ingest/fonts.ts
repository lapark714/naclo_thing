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
import { coveredRanges, uncoveredChars, allText, type Range } from "./validate";

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

/**
 * Two block pairs in BLOCKS share a family — Greek/Cyrillic both resolve to
 * "Noto Sans", Hiragana/Katakana both to "Noto Sans JP". A map keyed by family
 * name alone can hold only one block per family, so if both scripts in a pair
 * are missing in the same run, whichever block was inserted first is lost —
 * and with it, the only thing that told the caller which unicode-range to
 * look for. Grouping into a list per family keeps every block a family must
 * cover, instead of silently keeping just the last one seen.
 */
export function groupByFamily(blocks: ScriptBlock[]): Map<string, ScriptBlock[]> {
  const out = new Map<string, ScriptBlock[]>();
  for (const block of blocks) {
    const existing = out.get(block.family);
    if (existing) existing.push(block);
    else out.set(block.family, [block]);
  }
  return out;
}

/** True when a @font-face for this exact woff2 file is already in the CSS text. */
export function alreadyDeclared(css: string, slug: string): boolean {
  return css.includes(`url("/fonts/${slug}")`);
}

export async function ensureCoverage(records: Problem[]): Promise<Flag[]> {
  const flags: Flag[] = [];

  // coveredRanges() is the one throwing call before the per-family loop below
  // (it reads CSS_FILE via validate.ts). Guarded on its own, same as the
  // later CSS read/write, so a caller looping this over several exam years
  // (Task 9's orchestrator) never has one bad read abort the whole run.
  let ranges: Range[];
  try {
    ranges = coveredRanges();
  } catch (err) {
    flags.push({
      kind: "font", path: CSS_FILE,
      note: `could not read current font coverage: ${err instanceof Error ? err.message : String(err)}`,
    });
    return flags;
  }

  const missing = new Map<string, number>();
  for (const r of records) {
    for (const [ch, cp] of uncoveredChars(allText(r), ranges)) missing.set(ch, cp);
  }
  if (missing.size === 0) return flags;

  // One entry per script block, not per character — blockOf returns the same
  // BLOCKS reference for every codepoint in a script, so this also dedupes.
  const neededBlocks = new Map<string, ScriptBlock>();
  for (const [ch, cp] of missing) {
    const block = blockOf(cp);
    if (!block) {
      flags.push({
        kind: "font", path: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
        a: ch, note: "no Noto family is mapped for this codepoint; add one by hand",
      });
      continue;
    }
    neededBlocks.set(block.name, block);
  }

  const families = groupByFamily([...neededBlocks.values()]);
  if (families.size === 0) return flags;

  // Read once, up front: alreadyDeclared() is checked per candidate slug
  // below, so a re-run over a gap that a previous run already closed skips
  // every already-declared face instead of appending it a second time.
  let existingCss: string;
  try {
    existingCss = readFileSync(CSS_FILE, "utf8");
  } catch (err) {
    flags.push({
      kind: "font", path: CSS_FILE,
      note: `could not read the existing font declarations: ${err instanceof Error ? err.message : String(err)}`,
    });
    return flags;
  }

  let appended = "";
  let appendedCount = 0;

  for (const [family, blocks] of families) {
    // A batch this size (58 problems, up to a couple dozen families) must
    // survive one bad response, a dropped connection, or a full disk on any
    // single family — that is the whole point of running this unattended.
    // Every throwing call in this body (both fetches, the text/arrayBuffer
    // reads, the woff2 write) is covered by this one guard, so a call added
    // here later is covered automatically instead of reopening the gap.
    try {
      const res = await fetch(googleCssUrl(family), { headers: { "User-Agent": UA } });
      if (!res.ok) {
        flags.push({ kind: "font", path: family, note: `Google Fonts returned ${res.status}` });
        continue;
      }
      const faces = parseFontFaces(await res.text());
      // A face is wanted if it covers ANY block this family must carry, not
      // just one — narrowing to a single block's codepoint here is exactly
      // how a second script sharing this family used to go uncovered even
      // though a face for it was in the response the whole time.
      const wanted = faces.filter((f) => blocks.some((block) =>
        f.unicodeRange.toUpperCase().includes(`U+${block.lo.toString(16).toUpperCase().padStart(4, "0")}`),
      ));
      const chosen = wanted.length > 0 ? wanted : faces;

      for (const [i, face] of chosen.entries()) {
        const matched = blocks.find((block) =>
          face.unicodeRange.toUpperCase().includes(`U+${block.lo.toString(16).toUpperCase().padStart(4, "0")}`),
        ) ?? blocks[0];
        const slug = `${family.replace(/ /g, "")}-400-${matched.name.toLowerCase()}${i > 0 ? `-${i}` : ""}.woff2`;
        const dest = join(FONTS_DIR, slug);
        if (!existsSync(dest)) {
          const bin = await fetch(face.woff2Url, { headers: { "User-Agent": UA } });
          if (!bin.ok) {
            flags.push({ kind: "font", path: slug, note: `woff2 download returned ${bin.status}` });
            continue;
          }
          writeFileSync(dest, Buffer.from(await bin.arrayBuffer()));
        }

        if (alreadyDeclared(existingCss + appended, slug)) {
          console.log(`  font: ${slug} already declared in ${CSS_FILE}, skipping`);
          continue;
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
        appendedCount += 1;
        console.log(`  font: added ${slug} for ${matched.name}`);
      }
    } catch (err) {
      flags.push({
        kind: "font", path: family,
        note: `unexpected error while fetching or writing this family: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  if (appended) {
    try {
      writeFileSync(CSS_FILE, existingCss + appended);
      console.log(`  font: appended ${appendedCount} new @font-face declaration(s) to ${CSS_FILE}`);
      console.log(`  font: add these families to the --data-stack variable by hand if the data should prefer them`);
    } catch (err) {
      flags.push({
        kind: "font", path: CSS_FILE,
        note: `downloaded woff2 file(s) but could not write ${CSS_FILE}: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }
  return flags;
}
