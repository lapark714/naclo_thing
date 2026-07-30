/**
 * NACLO publishes no concept tags, so this vocabulary is invented for the site.
 * Keep it small — a filter with forty options filters nothing.
 *
 * Problems take several domain tags and exactly one form tag.
 */

export const CONCEPT_TAGS = [
  "phonology",
  "morphology",
  "syntax",
  "semantics",
  "writing systems",
  "historical and comparative",
  "sociolinguistics",
  "number systems",
] as const;

export const FORM_TAGS = [
  "rosetta-stone translation",
  "table completion",
  "rule discovery",
  "transliteration",
  "calendrical and counting",
  "formal and computational",
] as const;

export type ConceptTag = (typeof CONCEPT_TAGS)[number];
export type FormTag = (typeof FORM_TAGS)[number];

export const DIFFICULTIES = ["intro", "standard", "hard"] as const;
export const ROUNDS = ["open", "invitational"] as const;
