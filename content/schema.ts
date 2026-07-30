import { z } from "zod";

/**
 * One record per problem. Shared by the ingest scripts and the site, so the
 * same shape is enforced when a record is written and when it is read.
 */

/** How a sub-question gets checked. Decided at ingest, never guessed at runtime. */
export const GradingMode = z.enum(["exact", "llm", "self"]);
export type GradingMode = z.infer<typeof GradingMode>;

export const Question = z.object({
  id: z.string(),
  /** Stem shown next to the input, e.g. the Sranan word being translated. */
  promptHtml: z.string(),
  /** Optional grouping label, e.g. "A1". Drives the gutter rail. */
  part: z.string().optional(),
  /** Optional instruction shown once above the first question of a part. */
  partPrompt: z.string().optional(),
  gradingMode: GradingMode,
  answerKey: z.string(),
  acceptedVariants: z.array(z.string()).default([]),
  /** Fixed set of options. Present turns the input into a choice list. */
  choices: z.array(z.string()).optional(),
  /** Rubric shown when gradingMode is "self". */
  rubric: z.string().optional(),
  points: z.number(),
});
export type Question = z.infer<typeof Question>;

export const Hint = z.object({
  tier: z.number().int().min(1).max(3),
  text: z.string(),
  xpCost: z.number().int().min(0),
});
export type Hint = z.infer<typeof Hint>;

export const Asset = z.object({
  src: z.string(),
  alt: z.string(),
});

export const Problem = z.object({
  id: z.string(), // "2026-open-A"
  year: z.number().int(),
  round: z.enum(["open", "invitational"]),
  letter: z.string(),
  title: z.string(),
  authors: z.array(z.string()).min(1),
  sourcePdfUrl: z.string().url(),
  solutionPdfUrl: z.string().url().optional(),

  conceptTags: z.array(z.string()).min(1),
  formTag: z.string(),
  difficulty: z.enum(["intro", "standard", "hard"]),
  languages: z.array(z.string()).default([]),

  officialPoints: z.number(),
  /** Exam budget, and the basis for the suggested per-question timer. */
  officialTimeMinutes: z.number(),

  bodyHtml: z.string(),
  assets: z.array(Asset).default([]),

  questions: z.array(Question).min(1),
  hints: z.array(Hint).length(3),
  explanationHtml: z.string(),

  /** The build serves only "published". This is what keeps drafts off the site. */
  reviewStatus: z.enum(["drafted", "reviewed", "published"]),
});
export type Problem = z.infer<typeof Problem>;
