/**
 * Turns the mechanical extraction into catalogue records.
 *
 * The concept tags and languages below are hand-assigned from reading each
 * problem's opening paragraph — they are the one part of a catalogue entry that
 * cannot be extracted. Difficulty is a proxy for the official point value until
 * someone corrects it by hand.
 *
 * Usage: tsx scripts/ingest/extract-catalogue.ts && tsx scripts/ingest/build-catalogue.ts
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

type Raw = {
  year: number;
  letter: string;
  title: string;
  points: number;
  pages: number;
};

/** key -> [conceptTags, formTag, languages] */
const TAGS: Record<string, [string[], string, string[]]> = {
  "2018A": [["morphology", "syntax"], "rosetta-stone translation", ["Gilbertese"]],
  "2018B": [["morphology", "phonology"], "rule discovery", ["Northern Pame", "Central Pame"]],
  "2018C": [["syntax", "semantics"], "rule discovery", ["Albanian"]],
  "2018D": [["syntax"], "formal and computational", []],
  "2018E": [["morphology"], "rule discovery", ["Palauan"]],
  "2018F": [["morphology", "semantics"], "rosetta-stone translation", ["Vietnamese"]],
  "2018G": [["writing systems"], "formal and computational", []],
  "2018H": [["writing systems"], "transliteration", ["Maninka", "Dyula", "Bambara"]],

  "2020A": [["morphology", "phonology"], "rule discovery", ["Mongo"]],
  "2020B": [["morphology", "writing systems"], "rosetta-stone translation", ["Chintang"]],
  "2020C": [["writing systems", "historical and comparative"], "transliteration", ["Old Persian"]],
  "2020D": [["semantics"], "formal and computational", []],
  "2020E": [["number systems"], "calendrical and counting", ["Breton"]],
  "2020F": [["syntax", "morphology"], "rule discovery", ["Paiwan"]],
  "2020G": [["writing systems"], "formal and computational", []],
  "2020H": [["writing systems", "historical and comparative"], "transliteration", ["Cypriot Greek"]],

  "2021A": [["syntax", "morphology"], "rosetta-stone translation", ["Malagasy"]],
  "2021B": [["writing systems", "phonology"], "rule discovery", ["English"]],
  "2021C": [["morphology", "syntax"], "rosetta-stone translation", ["Waama"]],
  "2021D": [["syntax", "semantics"], "formal and computational", []],
  "2021E": [["writing systems"], "transliteration", ["Kongo", "Lingala"]],
  "2021F": [["morphology", "syntax"], "rosetta-stone translation", ["Dime"]],
  "2021G": [["morphology"], "rosetta-stone translation", ["Sauk"]],
  "2021H": [["writing systems"], "formal and computational", []],
  "2021I": [["semantics"], "formal and computational", []],

  "2022A": [["writing systems"], "transliteration", ["Raga"]],
  "2022B": [["morphology", "syntax"], "rosetta-stone translation", ["Turkish"]],
  "2022C": [["semantics"], "formal and computational", []],
  "2022D": [["number systems", "writing systems"], "calendrical and counting", ["Iñupiaq"]],
  "2022E": [["morphology", "phonology"], "rule discovery", ["Ik"]],
  "2022F": [["morphology", "syntax"], "rosetta-stone translation", ["Ende"]],
  "2022G": [["syntax"], "formal and computational", []],
  "2022H": [["morphology", "semantics"], "rosetta-stone translation", ["Tseltal"]],
  "2022I": [["historical and comparative", "phonology"], "rule discovery", ["Cornish"]],

  "2023A": [["historical and comparative", "syntax"], "rule discovery", []],
  "2023B": [["phonology"], "rule discovery", ["Ho-Chunk"]],
  "2023C": [["semantics"], "rule discovery", []],
  "2023D": [["morphology"], "rosetta-stone translation", ["Permyak"]],
  "2023E": [["semantics"], "formal and computational", []],
  "2023F": [["number systems"], "calendrical and counting", ["Nizaa"]],
  "2023G": [["morphology"], "rosetta-stone translation", ["Classical Nahuatl"]],
  "2023H": [["morphology", "semantics"], "rule discovery", ["Lardil"]],

  "2024A": [["writing systems", "historical and comparative"], "transliteration", ["Latin"]],
  "2024B": [["semantics", "morphology"], "rule discovery", ["Warlpiri"]],
  "2024C": [["morphology"], "calendrical and counting", ["Ewe"]],
  "2024D": [["syntax"], "formal and computational", []],
  "2024E": [["writing systems"], "transliteration", ["Japanese"]],
  "2024F": [["morphology", "syntax"], "rule discovery", ["Paiwan"]],
  "2024G": [["semantics"], "formal and computational", []],
  "2024H": [["morphology", "semantics"], "rule discovery", ["Tariana"]],

  "2025A": [["semantics"], "rule discovery", []],
  "2025B": [["phonology", "morphology"], "rule discovery", ["Kri"]],
  "2025C": [["semantics"], "rule discovery", []],
  "2025D": [["semantics"], "rule discovery", []],
  "2025E": [["morphology", "historical and comparative"], "rosetta-stone translation", ["Armenian"]],
  "2025F": [["semantics"], "formal and computational", []],
  "2025G": [["phonology", "morphology"], "rule discovery", ["Sakata"]],
  "2025H": [["historical and comparative", "number systems"], "rule discovery", ["Basque"]],
};

const SOURCE_URL = "https://naclo.org/practice.php";

function difficultyFor(points: number): "intro" | "standard" | "hard" {
  if (points <= 5) return "intro";
  if (points <= 10) return "standard";
  return "hard";
}

const raw: Raw[] = JSON.parse(readFileSync("/tmp/catalogue-raw.json", "utf8"));
let written = 0;
let skipped = 0;
const untagged: string[] = [];

for (const p of raw) {
  const key = `${p.year}${p.letter}`;
  const tags = TAGS[key];
  if (!tags) {
    untagged.push(key);
    continue;
  }

  const id = `${p.year}-open-${p.letter}`;
  const path = `content/problems/${id}.json`;

  // Never clobber a full transcription with a catalogue stub.
  if (existsSync(path)) {
    const existing = JSON.parse(readFileSync(path, "utf8"));
    if (existing.tier !== "catalogue") {
      skipped += 1;
      continue;
    }
  }

  const [conceptTags, formTag, languages] = tags;
  const record = {
    id,
    tier: "catalogue",
    year: p.year,
    round: "open",
    letter: p.letter,
    title: p.title,
    authors: [],
    sourcePdfUrl: SOURCE_URL,
    conceptTags,
    formTag,
    difficulty: difficultyFor(p.points),
    languages,
    officialPoints: p.points,
    // The Open Round is three hours over eight problems and 100 points, so
    // minutes track points closely enough to seed a timer suggestion.
    officialTimeMinutes: Math.max(10, Math.round(p.points * 1.8)),
    bodyHtml: "",
    assets: [],
    questions: [],
    hints: [],
    explanationHtml: "",
    reviewStatus: "published",
  };

  writeFileSync(path, JSON.stringify(record, null, 2) + "\n");
  written += 1;
}

console.log(`wrote ${written} catalogue records, skipped ${skipped} already-full`);
if (untagged.length) console.log(`untagged (skipped): ${untagged.join(", ")}`);
