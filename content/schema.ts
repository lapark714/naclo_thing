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

/**
 * How much of a problem has been ingested.
 *
 * `full`      — transcribed, keyed, hint-laddered, explained. Playable.
 * `catalogue` — metadata only: findable and filterable, links out to the
 *               original booklet. Not playable until someone transcribes it.
 *
 * The tier exists so the archive can be discoverable long before it is all
 * transcribed, without pretending a catalogue entry is a practice problem.
 */
export const Tier = z.enum(["full", "catalogue"]);
export type Tier = z.infer<typeof Tier>;

export const Problem = z
  .object({
    id: z.string(), // "2026-open-A"
    tier: Tier.default("full"),
    year: z.number().int(),
    round: z.enum(["open", "invitational"]),
    letter: z.string(),
    title: z.string(),
    /** Empty on catalogue entries: the booklets carry one blanket copyright
     *  rather than per-problem bylines, so the credit comes from the original. */
    authors: z.array(z.string()).default([]),
    sourcePdfUrl: z.string().url(),
    solutionPdfUrl: z.string().url().optional(),

    conceptTags: z.array(z.string()).min(1),
    formTag: z.string(),
    difficulty: z.enum(["intro", "standard", "hard"]),
    languages: z.array(z.string()).default([]),

    officialPoints: z.number(),
    /** Exam budget, and the basis for the suggested per-question timer. */
    officialTimeMinutes: z.number(),

    bodyHtml: z.string().default(""),
    assets: z.array(Asset).default([]),

    questions: z.array(Question).default([]),
    hints: z.array(Hint).default([]),
    explanationHtml: z.string().default(""),

    /** The build serves only "published". This is what keeps drafts off the site. */
    reviewStatus: z.enum(["drafted", "reviewed", "published"]),
  })
  // A full record must actually be playable. Catalogue records are exempt,
  // which is the only thing the tier buys them.
  .superRefine((p, ctx) => {
    if (p.tier !== "full") return;
    if (p.questions.length < 1) {
      ctx.addIssue({ code: "custom", path: ["questions"], message: "a full record needs at least one question" });
    }
    if (p.hints.length !== 3) {
      ctx.addIssue({ code: "custom", path: ["hints"], message: "a full record needs exactly 3 hints" });
    }
    if (!p.bodyHtml.trim()) {
      ctx.addIssue({ code: "custom", path: ["bodyHtml"], message: "a full record needs a transcribed body" });
    }
    if (!p.explanationHtml.trim()) {
      ctx.addIssue({ code: "custom", path: ["explanationHtml"], message: "a full record needs an explanation" });
    }
    if (p.authors.length < 1) {
      ctx.addIssue({ code: "custom", path: ["authors"], message: "a full record needs a byline" });
    }
  });
export type Problem = z.infer<typeof Problem>;
