# NACLO Prep Platform

# Part 1 — Product Requirements

## What this is

NACLO publishes its past exams as PDFs, with solution PDFs for most problems. Everything a student needs is technically available and practically unusable. You can't search it, you can't filter it, and when you get stuck your only two options are to keep staring or to read the whole answer.

This is a website that turns the same archive into something you can practice against. Same problems, same official answers, plus the things the PDFs don't give you: filtering by concept, graduated hints, worked explanations, and a clock you control.

No new problems get written. The NACLO back catalogue is the entire question bank.

## Who uses it

Mostly high school and middle school students preparing for the Open Round, concentrated in the weeks before it runs in late January. Some have done a handful of problems before. Many are looking at their first Rosetta-stone table. A smaller group preparing for the Invitational Round wants harder material and full timed papers.

Two things follow from that. Usage is seasonal, so nothing should depend on daily habit. And a meaningful share of users are under 13, which is why the site collects no personal information.

## Core features

### Practice by concept

The student picks a concept and gets problems of that type. "Morphology." "Writing systems." "Number systems." Filters stack, so "phonology, Invitational round" is a valid request.

This requires every problem to carry concept tags. NACLO doesn't publish any, so building that taxonomy is part of the work (Part 2, Content Pipeline).

### Hints

Each problem has three hints, available in order, written in advance.

1. **Orientation.** Where to look. *"Compare rows 2 and 5. What changes between them?"*

2. **Method.** The insight, stated but not applied. *"The suffix is marking number, rather than case."*

3. **Partial Work** One step worked through, the rest left alone.

Taking a hint reduces the XP the problem is worth, and later hints cost more than earlier ones. The point is to make help available without making it free.

### Explanations

After an attempt, the student can open a full walkthrough: not just the official answer, but the path a solver would take to reach it. This is the main thing the site adds over the existing PDFs, since NACLO's keys give the answer and rarely give the reasoning.

Explanations are written during ingestion and reviewed by a person before publishing. Every student sees the same one.

### Answer checking

The student types an answer and finds out whether it's right. How that check works depends on the question:

| Question type | Check |
|---|---|
| Table cells, single words, matching, ordering | Automatic comparison against the key |
| Short free response, e.g. "translate these sentences" | AI compares the answer to the official key and explains the verdict |
| Open-ended, e.g. "state the rule" | The key and rubric are revealed, and the student marks their own |

Partial credit follows NACLO's own point breakdowns where the official key provides them.

When the AI grades something, the student can flag the result as wrong. Flags get reviewed, and correct answers that were wrongly rejected get added to the accepted list.

### XP and progress

XP is awarded per problem solved and reduced by hints taken. Progress is tracked per concept, so the interface can show "Morphology 6/14" rather than a lifetime point total. For a student cramming in January, coverage is the more useful number.

There are no streaks. Streak mechanics assume daily use, and this audience shows up for three weeks a year.

Progress is stored in the browser. No account, no sign-up, nothing to forget. The cost is that progress doesn't follow you between devices, which is an acceptable trade for launch.

### Timing

Three modes, all running over the same problems.

**Untimed** is the default for practice. A clock on your first unfamiliar problem type measures nothing useful.

**Custom per-question timer.** The student can set a time limit on any practice question. The field arrives pre-filled with a suggestion based on the problem's official time allowance, but any value is allowed, and a global default can be set once in settings instead of re-entered every time. When the timer runs out, a banner appears and the input stays live. This is a pacing tool, not a punishment, and cutting someone off mid-thought interrupts them at the worst possible moment. The timer survives a page refresh.

Time taken does not affect XP. A speed bonus would reward guessing, which is the opposite of what NACLO tests.

**Full exam mode** runs a complete past paper under its official total time and stops hard at expiry, scored against official points. This is the one place a hard cutoff belongs, because the whole point is simulating the real thing.

*Deferred as of 2026-07-30.* The MVP covers individual problems only. Problem records still carry `year`, `round`, `officialPoints`, and `officialTimeMinutes`, so whole papers can be assembled later without a schema change.

### Attribution

NACLO problems credit individual authors. Every problem page carries the byline and links back to the original problem and solution PDFs.

## NOT in scope for v1

Accounts, leaderboards, a native app, and AI-generated original problems. Full timed exam mode is also deferred (see Timing). All reasonable later. None needed to find out whether the core idea works.

---

# Part 2 — Technical Overview

## The shape of it

The AI never reads a PDF while a student is on the page. PDFs are processed once, offline, into structured problem records that a person reviews before they go live. The website is then a static site serving reviewed content.

```
NACLO problem PDF + solution PDF
        ↓
  extract & transcribe            offline, one-time
        ↓
  AI drafts tags, hints,
  explanation, grading modes
        ↓
  human review                    quality gate
        ↓
  content/problems/*.json
        ↓
  static site build
```

Four reasons this is worth the up-front work. Every student sees identical content, so the XP cost of "took hint 2" means the same thing for everyone. A wrong explanation can be caught by a person before it ships, which is impossible if the text doesn't exist until a student loads the page. Annotation becomes a one-time cost instead of a bill that grows with traffic forever. And pages load instantly, because nothing is being generated.

The only AI that runs at request time is free-text grading, which is a small and optional part of the system.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript, statically generated |
| Styling | Tailwind CSS |
| UI components | shadcn/ui where useful (dialogs, tabs, inputs) |
| Content store | JSON files in the repo. No database. |
| Schema & validation | Zod, enforced at build time |
| Search / filter | Client-side, over an index generated at build |
| Progress & XP | 'localStorage' |
| AI grading | One serverless route calling the Claude API |
| Ingestion pipeline | Standalone TypeScript scripts, run by hand |
| Hosting | Vercel free tier (Netlify or Cloudflare Pages work the same) |
| Fonts | Self-hosted Noto Sans subsets, Charis SIL for IPA |

Two notes on the choices.

**No database.** A few hundred read-only records that change once a year don't need one. JSON in git gives version history, diffable review, and no operational surface at all. If the site ever grows user accounts, revisit it then.

**Next.js is a default, not a requirement.** Astro arguably suits a content-heavy site with localized interactivity slightly better. Next is the recommendation because it's the more common skill and easier to get help with. Nothing below the framework row changes if you swap it.

## Content pipeline

Run manually, once per batch of problems. Lives in 'scripts/ingest/', entirely separate from the web app.

1. **Fetch.** Download problem and solution PDFs from NACLO, keeping year, round, and problem letter.

2. **Transcribe.** Convert the PDF into HTML. Partly automated, substantially manual (see below).

3. **Draft.** An AI pass over the transcribed problem and its solution produces concept tags, the three hints, the step-by-step explanation, and a proposed grading mode and answer key for each sub-question.

4. **Review.** A person checks all of it and fixes what's wrong. Records stay 'drafted' until reviewed, and the site only ever serves 'published'.

5. **Validate.** A script checks every record against the Zod schema, confirms referenced image files exist, and confirms every sub-question has a key. Runs in CI and blocks the build.

Step 4 is the bottleneck, and it should be. It's the reason the content can be trusted.

## Transcription is the expensive part

NACLO PDFs are not ordinary documents. They contain IPA and stacked diacritics, non-Latin scripts (Devanagari, Georgian, Cherokee syllabary, Amharic), glyph specimens that exist only as images, alignment-critical data tables where the row and column correspondence is the actual puzzle, and the occasional kinship tree or phonological chart.

'pdftotext' and similar tools destroy most of this. A Rosetta-stone table with broken alignment isn't a degraded problem, it's an unsolvable one.

The approach is hybrid, decided per problem:

- Prose becomes Unicode HTML.

- Data tables become real `<table>` markup, transcribed and checked cell by cell.

- Glyph specimens and diagrams get cropped out of the PDF and stored as images with alt text.

Everything is UTF-8, and the font stack has to actually cover what's used. A missing-glyph box in the middle of a phonology problem breaks the problem.

Cell-by-cell table checking is where the review hours go. The Phase 1 slice exists mainly to measure how many.

## Data model

One record per problem. Exam membership is a field, not a folder, which is what lets the same store feed both concept drills and full timed exams.

```ts
// content/schema.ts
export const Question = z.object({
  id: z.string(),
  promptHtml: z.string(),
  gradingMode: z.enum(['exact', 'llm', 'self']),
  answerKey: z.string(),
  acceptedVariants: z.array(z.string()).default([]),
  points: z.number(),
})

export const Problem = z.object({
  id: z.string(),                       // "2019-open-C"
  year: z.number(),
  round: z.enum(['open', 'invitational']),
  letter: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  sourcePdfUrl: z.string().url(),
  solutionPdfUrl: z.string().url().optional(),

  conceptTags: z.array(z.string()).min(1),
  formTag: z.string(),
  difficulty: z.enum(['intro', 'standard', 'hard']),
  languages: z.array(z.string()).default([]),

  officialPoints: z.number(),
  officialTimeMinutes: z.number(),      // exam budget + basis for the suggested timer

  bodyHtml: z.string(),
  assets: z.array(z.object({ src: z.string(), alt: z.string() })).default([]),

  questions: z.array(Question).min(1),
  hints: z.array(z.object({ tier: z.number(), text: z.string(), xpCost: z.number() })).length(3),
  explanationHtml: z.string(),

  reviewStatus: z.enum(['drafted', 'reviewed', 'published']),
})
```

'reviewStatus' is what keeps unreviewed AI output away from students. The build filters on it.

### Concept tags

The vocabulary behind 'conceptTags' and 'formTag', since it has to be invented:

**Linguistic Domain** — phonology, morphology, syntax, semantics, writing systems, historical and comparative, sociolinguistics, number systems.

**Problem Form** — Rosetta-stone translation, table completion, rule discovery, transliteration, calendrical and counting, formal and computational (parsing, edit distance, encoding, finite-state).

Problems take several domain tags, not one. Difficulty starts as a proxy for round and can be corrected later by hand.

## Grading

Grading mode is stored per sub-question, decided at ingest, never guessed at runtime. This matters because a single NACLO problem routinely mixes a fill-in-the-table part that grades automatically with a "state the rule" part that can't. Tagging at the problem level would force the harder case onto everything and throw away automatic grading where it was available.

**'exact'** runs entirely in the browser. A pure function normalizes both sides (lowercase, strip combining marks, collapse whitespace, normalize apostrophes and hyphens) and compares against the key plus its accepted-variants list. No network, no cost, instant.

**'llm'** posts to '/api/grade' with the question id and the student's answer. The route looks up the official key server-side, asks the Claude API to compare the two, and returns a verdict with a short reason. The API key never reaches the client. Responses are cached on '(questionId, normalizedAnswer)', since students converge on the same handful of wrong answers and there's no reason to pay twice for the same one.

**'self'** needs no code beyond revealing the key and rubric and recording what the student claims. Self-reported XP is stored with a flag so the interface can distinguish it later.

Push as much as possible into 'exact'. It's free, offline, instant, and gives the same answer every time. Hints are never generated at request time either, for the same reason plus one more: a model holding the full solution tends to give too much away.

## Progress, XP, and timers

Progress lives in 'localStorage' behind a small typed module, roughly:

```ts
type Progress = {
  problems: Record<string, {
    solved: boolean
    xpEarned: number
    hintsUsed: number
    selfGraded: boolean
  }>
}
```

Timers store a start timestamp and a duration, never an elapsed-second counter. Counters drift when the tab is backgrounded and reset on reload, which would let an attempt be restarted by accident or on purpose. A render tick recomputes remaining time from the timestamp, for display only. Practice mode shows a banner at expiry and leaves the input enabled. Exam mode submits and locks.

## Rendering

Wide data tables need a horizontally scrolling container so the page body never scrolls sideways. This matters because a lot of students will be on a phone, and it's worth testing early, since it may change how tables get transcribed in the first place.

Fonts are self-hosted and subset. Web-safe defaults don't cover IPA or most of the scripts these problems use.

## Repo layout

```
content/
  problems/*.json          one file per problem, reviewed, in git
  schema.ts                Zod schema, shared by pipeline and site
scripts/
  ingest/                  fetch, transcribe, draft, validate
app/                       Next.js routes
  practice/                concept filter + problem view
  exam/                    full timed papers
  api/grade/               the only server route
lib/
  grading.ts               exact-match normalization
  progress.ts              localStorage wrapper
  timer.ts                 timestamp-based timing
```

## Phase 1

Ingest one full past exam, roughly eight problems, and take it all the way through: tagged, hint-laddered, explained, grading modes assigned, published. Build practice mode, hints, explanations, and both practice timing modes (untimed and the custom per-question timer) over just those.

The goal isn't a demo. It's to find out how long one problem actually takes to annotate properly, because that number decides whether the full back catalogue is a month of work or a year. Eight problems is enough to learn it and small enough to throw away if the pipeline turns out wrong.

Ingest the rest of the archive only after that slice is genuinely pleasant to use.

## Open technical questions

**What fraction of sub-questions can grade with 'exact'?** Sample one exam and count. At 80%, the AI grading route is nearly optional and the site is effectively static. At 20%, the cost and complexity picture changes. This is about an hour of work and it should happen before anything gets built.

**Alt text when the glyph is the puzzle.** Describing a Mayan numeral for a screen reader without handing over the answer is a real problem with no clean solution yet.

**Solution PDFs.** Link to NACLO's originals alongside the new explanations, or replace them?

**Cross-device progress.** 'localStorage' is the right launch answer. If students start asking for sync, that's the point at which accounts, and everything that comes with collecting data from minors, has to be thought through properly.
