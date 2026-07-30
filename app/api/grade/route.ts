import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getQuestion } from "@/lib/content";

/**
 * The only server route in the project.
 *
 * It looks up the official key server-side, asks Claude to compare it against
 * the student's answer, and returns a verdict with a short reason. The API key
 * never reaches the client, and neither does the answer key for `llm`
 * questions.
 */

export const runtime = "nodejs";

const Body = z.object({
  problemId: z.string().min(1).max(64),
  questionId: z.string().min(1).max(64),
  answer: z.string().min(1).max(2000),
});

/** Verdicts are cached on (questionId, normalizedAnswer) — students converge
 *  on the same handful of wrong answers, and there is no reason to pay twice. */
const cache = new Map<string, { correct: boolean; reason: string }>();
const CACHE_LIMIT = 500;

/** Crude per-instance rate limit. Enough to stop a loop, not a determined abuser. */
const hits = new Map<string, { count: number; resetAt: number }>();
const LIMIT = Number(process.env.GRADE_RATE_LIMIT_PER_MINUTE ?? 20);

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
}

function normalizeForCache(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_ENABLE_AI_GRADING === "false") {
    return Response.json({ error: "AI grading is turned off. Mark it yourself." }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) {
    return Response.json(
      { error: "Too many checks in a minute. Wait a moment, or mark it yourself." },
      { status: 429 },
    );
  }

  let parsed;
  try {
    parsed = Body.safeParse(await request.json());
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }
  if (!parsed.success) {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const { problemId, questionId, answer } = parsed.data;

  const question = getQuestion(problemId, questionId);
  if (!question) {
    return Response.json({ error: "Unknown question." }, { status: 404 });
  }
  if (question.gradingMode !== "llm") {
    return Response.json({ error: "This question is not graded here." }, { status: 400 });
  }

  const cacheKey = `${questionId}::${normalizeForCache(answer)}`;
  const cached = cache.get(cacheKey);
  if (cached) return Response.json(cached);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Grading is not configured. Mark it yourself." },
      { status: 503 },
    );
  }

  const accepted = [question.answerKey, ...question.acceptedVariants];

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: process.env.GRADING_MODEL ?? "claude-sonnet-5",
      max_tokens: 300,
      system:
        "You grade a single translation from a linguistics olympiad. Compare the student's " +
        "answer to the official key. Mark it correct when it means the same thing, allowing " +
        "for natural variation in English wording, word order that does not change meaning, " +
        "and pronoun gender where the source language does not mark it. Mark it incorrect when " +
        "a grammatical feature is wrong: tense, number, negation, possession, or who is doing " +
        "what to whom. Never reveal the key. Give one short sentence of reasoning aimed at a " +
        "teenager, naming the feature that is wrong without supplying the correct form. " +
        'Reply with JSON only: {"correct": boolean, "reason": string}',
      messages: [
        {
          role: "user",
          content: [
            `Question: ${question.promptHtml}`,
            `Official key: ${question.answerKey}`,
            accepted.length > 1 ? `Also accepted: ${accepted.slice(1).join(" | ")}` : "",
            `Student answer: ${answer}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no JSON in grader response");

    const verdict = z
      .object({ correct: z.boolean(), reason: z.string().max(400) })
      .parse(JSON.parse(match[0]));

    if (cache.size >= CACHE_LIMIT) cache.clear();
    cache.set(cacheKey, verdict);

    return Response.json(verdict);
  } catch {
    return Response.json(
      { error: "The grader did not respond. Mark it yourself." },
      { status: 502 },
    );
  }
}
