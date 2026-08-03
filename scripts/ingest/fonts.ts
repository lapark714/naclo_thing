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
