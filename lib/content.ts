import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Problem } from "@/content/schema";

/**
 * Loads problem records at build time. Server-only — never imported into a
 * client component, so answer keys for `llm` questions stay on the server.
 */

const PROBLEMS_DIR = join(process.cwd(), "content", "problems");

let cache: Problem[] | null = null;

function loadAll(): Problem[] {
  if (cache) return cache;
  if (!existsSync(PROBLEMS_DIR)) return (cache = []);

  const records = readdirSync(PROBLEMS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const raw = JSON.parse(readFileSync(join(PROBLEMS_DIR, file), "utf8"));
      const parsed = Problem.safeParse(raw);
      if (!parsed.success) {
        throw new Error(
          `content/problems/${file} does not match the schema:\n${parsed.error.message}`,
        );
      }
      return parsed.data;
    })
    .sort((a, b) => b.year - a.year || a.letter.localeCompare(b.letter));

  return (cache = records);
}

/** The build serves only published records. This is the gate. */
export function getPublishedProblems(): Problem[] {
  return loadAll().filter((p) => p.reviewStatus === "published");
}

/**
 * The problems a student can actually work. Catalogue entries are published
 * records too, so this is the narrower gate: everything the site offers as
 * practice, and nothing it can only point at.
 */
export function getPlayableProblems(): Problem[] {
  return getPublishedProblems().filter((p) => p.tier === "full");
}

export function getProblem(id: string): Problem | undefined {
  return getPublishedProblems().find((p) => p.id === id);
}

/** Answer key lookup for the grading route. Never sent to the client. */
export function getQuestion(problemId: string, questionId: string) {
  const problem = getProblem(problemId);
  return problem?.questions.find((q) => q.id === questionId);
}

/**
 * The shape the client filter works over. Deliberately excludes questions,
 * hints and explanations so a filter page never ships answer keys.
 */
export type ProblemSummary = {
  id: string;
  year: number;
  round: Problem["round"];
  letter: string;
  title: string;
  authors: string[];
  conceptTags: string[];
  formTag: string;
  difficulty: Problem["difficulty"];
  languages: string[];
  officialPoints: number;
  officialTimeMinutes: number;
  questionCount: number;
};

export function getProblemIndex(): ProblemSummary[] {
  return getPlayableProblems().map((p) => ({
    id: p.id,
    year: p.year,
    round: p.round,
    letter: p.letter,
    title: p.title,
    authors: p.authors,
    conceptTags: p.conceptTags,
    formTag: p.formTag,
    difficulty: p.difficulty,
    languages: p.languages,
    officialPoints: p.officialPoints,
    officialTimeMinutes: p.officialTimeMinutes,
    questionCount: p.questions.length,
  }));
}

/**
 * The queue, counted rather than listed. A catalogue entry is a real record
 * with real metadata, but to a student it is only a promise, so the practice
 * page states how many are coming and from which years instead of putting
 * forty-odd unplayable rows in front of the ones that work.
 */
export type Upcoming = {
  total: number;
  byYear: { year: number; count: number }[];
};

export function getUpcoming(): Upcoming {
  const pending = getPublishedProblems().filter((p) => p.tier !== "full");
  const counts = new Map<number, number>();
  for (const p of pending) counts.set(p.year, (counts.get(p.year) ?? 0) + 1);

  return {
    total: pending.length,
    byYear: [...counts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, count]) => ({ year, count })),
  };
}

/**
 * What a client component is allowed to see: everything except the answer keys
 * of questions that are graded server-side.
 */
export type ClientQuestion = {
  id: string;
  part?: string;
  partPrompt?: string;
  promptHtml: string;
  gradingMode: Problem["questions"][number]["gradingMode"];
  choices?: string[];
  points: number;
  /** Present only for exact and self questions. */
  answerKey?: string;
  acceptedVariants?: string[];
  rubric?: string;
};

export function toClientQuestions(problem: Problem): ClientQuestion[] {
  return problem.questions.map((q) => {
    const base: ClientQuestion = {
      id: q.id,
      part: q.part,
      partPrompt: q.partPrompt,
      promptHtml: q.promptHtml,
      gradingMode: q.gradingMode,
      choices: q.choices,
      points: q.points,
    };
    // `exact` grades in the browser and `self` reveals the key on request, so
    // both need it client-side. `llm` keys stay on the server.
    if (q.gradingMode !== "llm") {
      base.answerKey = q.answerKey;
      base.acceptedVariants = q.acceptedVariants;
      base.rubric = q.rubric;
    }
    return base;
  });
}
