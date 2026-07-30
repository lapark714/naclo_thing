import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getProblem } from "@/lib/content";

/**
 * Request-time AI help: a nudge when the written hints have run out, and a
 * plain-language walkthrough on demand.
 *
 * The written hints and explanation in the content record remain the default.
 * This route exists for the case they cannot cover — a student stuck on one
 * specific sub-question — and it is deliberately kept on a short leash: the
 * model is given the answer key and told, at length, not to hand it over.
 */

export const runtime = "nodejs";

const Body = z.object({
  problemId: z.string().min(1).max(64),
  part: z.string().min(1).max(16).optional(),
  mode: z.enum(["hint", "explain", "reveal"]),
  /** How many AI hints the student has already taken for this part. */
  escalation: z.number().int().min(0).max(5).default(0),
});

const cache = new Map<string, string>();
const CACHE_LIMIT = 300;

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

const HINT_SYSTEM = `You are helping a student aged 12 to 17 who is stuck on a linguistics olympiad problem. They have already read the written hints and are still stuck.

Give ONE nudge and stop. Rules, in order of importance:

1. Never state the answer to any sub-question. Never give a translation, a matched letter, or a filled-in cell that appears in the answer key.
2. Point at evidence already in front of them. Name specific rows, words or examples and ask what changes between them.
3. Escalate only as far as you are told. Level 1: where to look. Level 2: name the pattern without applying it. Level 3: work through ONE example that is NOT one of the questions being asked, then stop.
4. Plain words. No linguistics jargon unless you immediately gloss it in ordinary English. Say "word ending" rather than "suffix" unless the problem itself used the term.
5. Two or three sentences. Warm, direct, never patronising. Do not open with praise or "Great question".

Reply with the hint text only. No preamble, no markdown headers.`;

const EXPLAIN_SYSTEM = `You are explaining part of a linguistics olympiad problem to a student aged 12 to 17, many of whom are looking at their first problem of this kind.

You are given the official worked explanation. Rewrite the part that is relevant into plain English.

Rules:
1. Lead with the single idea that unlocks it, in one sentence.
2. Then walk one concrete example through, using the problem's own data.
3. Replace jargon with ordinary words. If a technical term is genuinely useful, give it once and gloss it immediately.
4. Short paragraphs. No bullet lists longer than four items. Under 200 words.
5. Never invent linguistic facts. Everything must come from the explanation you were given.

Reply with the explanation only. Plain text with short paragraphs, no markdown headers.`;

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) {
    return Response.json(
      { error: "Too many requests in a minute. Wait a moment and try again." },
      { status: 429 },
    );
  }

  let parsed;
  try {
    parsed = Body.safeParse(await request.json());
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }
  if (!parsed.success) return Response.json({ error: "Malformed request." }, { status: 400 });

  const { problemId, part, mode, escalation } = parsed.data;

  const problem = getProblem(problemId);
  if (!problem) return Response.json({ error: "Unknown problem." }, { status: 404 });

  // Revealing needs no model. The student is choosing to trade the part's XP
  // for the key, which is why `llm` keys are not in the client bundle to begin
  // with — they arrive only when asked for.
  if (mode === "reveal") {
    const scope = part ? problem.questions.filter((q) => q.part === part) : problem.questions;
    return Response.json({
      answers: Object.fromEntries(scope.map((q) => [q.id, q.answerKey])),
    });
  }

  const cacheKey = `${problemId}::${part ?? "all"}::${mode}::${escalation}`;
  const cached = cache.get(cacheKey);
  if (cached) return Response.json({ text: cached });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI help is not set up. The written hints below still work." },
      { status: 503 },
    );
  }

  const scoped = part ? problem.questions.filter((q) => q.part === part) : problem.questions;
  const partPrompt = scoped.find((q) => q.partPrompt)?.partPrompt ?? "";

  // The model sees the keys so it knows what NOT to say, and so an explanation
  // is grounded rather than invented.
  const context = [
    `Problem: ${problem.title} (NACLO ${problem.year}, ${problem.round} round)`,
    `Concepts: ${problem.conceptTags.join(", ")}`,
    ``,
    `Problem text (HTML):`,
    problem.bodyHtml,
    ``,
    part ? `The student is stuck on part ${part}: ${partPrompt}` : `Whole problem.`,
    ``,
    `Sub-questions in scope and their answers (DO NOT reveal these):`,
    ...scoped.map((q) => `  ${q.id}: ${q.promptHtml} => ${q.answerKey}`),
    ``,
    mode === "explain"
      ? `Official worked explanation (HTML):\n${problem.explanationHtml}`
      : `Written hints the student has already seen:\n${problem.hints
          .map((h) => `  ${h.tier}. ${h.text}`)
          .join("\n")}`,
    ``,
    mode === "hint"
      ? `Give a level ${Math.min(escalation + 1, 3)} nudge.`
      : `Explain it in plain English.`,
  ].join("\n");

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: process.env.GRADING_MODEL ?? "claude-sonnet-5",
      // Generous. A level-3 nudge reasons before it writes, and truncating
      // mid-sentence is worse than paying for a few hundred extra tokens.
      max_tokens: mode === "explain" ? 1600 : 1000,
      system: mode === "hint" ? HINT_SYSTEM : EXPLAIN_SYSTEM,
      messages: [{ role: "user", content: context }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!text) throw new Error("empty response");

    if (cache.size >= CACHE_LIMIT) cache.clear();
    cache.set(cacheKey, text);

    return Response.json({ text });
  } catch (err) {
    // Server-side only. The student gets a usable message, not a stack trace.
    console.error("[/api/help]", mode, part ?? "all", err);
    return Response.json(
      { error: "Could not reach the helper. The written hints below still work." },
      { status: 502 },
    );
  }
}
