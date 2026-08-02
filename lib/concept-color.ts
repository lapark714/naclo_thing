import { CONCEPT_TAGS } from "@/content/taxonomy";

/**
 * One colour per concept, so the library can be scanned by subject the way a
 * reference grammar's section tabs work. The values live in globals.css as
 * `--c-*`; this only maps a tag to its variable.
 *
 * Colour is never the only cue. Every dot sits beside the tag's name and every
 * filled chip carries its label, so the code is redundant by design.
 */
const VAR: Record<string, string> = {
  phonology: "--c-phonology",
  morphology: "--c-morphology",
  syntax: "--c-syntax",
  semantics: "--c-semantics",
  "writing systems": "--c-writing-systems",
  "historical and comparative": "--c-historical",
  sociolinguistics: "--c-sociolinguistics",
  "number systems": "--c-number-systems",
};

/** A tag outside the taxonomy falls back to ink rather than inventing a hue. */
export function conceptColor(tag: string): string {
  return `var(${VAR[tag] ?? "--ink-soft"})`;
}

export const CONCEPTS_WITH_COLOR = CONCEPT_TAGS;
