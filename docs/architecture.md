# Architecture

High-level system architecture, data flow, and component relationships for the NACLO Prep Platform.

## System Overview

A statically generated Next.js site over JSON content files, with no database. NACLO PDFs are processed offline by a pipeline that drafts each problem twice, cross-checks the two passes against each other and against the booklet's own text layer, and arbitrates what disagrees; a record reaches `content/problems/` only when every gate clears, and anything else parks in `content/parked/` for a person to review later. The build turns `published` records into static pages. AI runs in three places: offline it drafts, cross-checks, and arbitrates in the ingest pipeline; at request time `/api/grade` grades free text; and `/api/help` gives AI hints and a plain-language explanation on top of the written ladder (see Notes in `docs/changelog.md` — a deliberate departure from the spec's offline-only stance).

## Data Flow

### Ingest — offline (`scripts/ingest/run.ts`, `npm run ingest -- <year...>`)
```
problem PDF + solution PDF        → /pdfs (gitignored), downloaded by hand
   ↓  manifest.ts                 → pages, title, official points, and author
                                    bylines read straight off the booklet's own
                                    text layer, then pinned — the model never
                                    owns these fields
   ↓  draft.ts (two passes)       → pass A: 150dpi, cell-by-cell. pass B: 300dpi,
                                    holistic. content/drafts/<id>.{a,b}.json
   ↓  diff.ts                     → the two passes compared on fact only
   ↓  witness.ts                  → language data checked against pdftotext
                                    output; skipped for 2019, whose booklets
                                    return a substitution cipher
   ↓  arbitrate.ts                → one model call per disagreement, given the
                                    page crop and the extracted text; never run
                                    for 2019, which has no independent evidence
   ↓  figures.ts                  → a coarse crop box, then a confirm pass;
                                    widened and retried up to three times
   ↓  fonts.ts                    → uncovered codepoints mapped to a Noto subset
                                    fetched from the Google Fonts CSS API
   ↓  publish.ts                  → every gate green  → content/problems/<id>.json
                                                          (reviewStatus: 'published')
                                    anything else       → content/parked/<id>.json
                                                          with its `_parkReasons`
   ↓  validate.ts                 → Zod + assets + keys + glyph coverage. Blocks
                                    the build.
   ↓  sync-assets.ts              → content/assets → public/content-assets (predev/prebuild)
```

Human review is no longer a publish gate. It is a follow-on pass over
`content/parked/` — committed on purpose, so it reads as a diff — and over
answers a student flags as wrong. A dated report of each run (attempted /
published / parked, and every park reason) lands in `docs/ingest-runs/`.

### Attempt — request time
```
/practice + filters  →  static page, prerendered from published records
   ↓  submit a sub-question answer, branch on gradingMode
      exact  →  lib/grading.ts normalizes both sides in-browser. No network.
      llm    →  POST /api/grade → key read server-side → Claude → { correct, reason }
      self   →  reveal key + rubric, student records own verdict
   ↓  lib/progress.ts → localStorage. Explanation unlocks after the attempt.
   ↓  stuck on a part?  →  help-popover.tsx  →  POST /api/help
      hint     →  Claude, escalating nudge, -2 XP, capped at 3/part
      explain  →  Claude, plain-language rewrite of the explanation, free
      reveal   →  answer key for that part, no model call, part XP → 0
```

**MVP scope: individual problems only.** Full timed exam mode is deferred. Problem records still carry `year`, `round`, `officialPoints`, and `officialTimeMinutes`, so whole papers can be assembled later without a schema change.

## Component Architecture

### Pages (App Router)
- `app/page.tsx` — Landing, per-concept coverage
- `app/practice/page.tsx` — Concept / round / difficulty filters over the build index
- `app/practice/[problemId]/page.tsx` — Single problem, statically generated

### Frontend Components
- `problem-view.tsx` — Main orchestrator: body, assets, questions, hints, timer, and explanation (folds in what would otherwise be `problem-body.tsx` / `explanation-panel.tsx`)
- `question-row.tsx` — One sub-question, branches on `gradingMode`
- `help-popover.tsx` — "Stuck?" button anchored to each part; written hint ladder, AI hints, plain-word explanation, answer reveal, all in one popover. Replaces `hint-ladder.tsx`
- `practice-timer.tsx` — Timestamp-based display; banner at expiry, input stays live
- `concept-filter.tsx` — Client-side filtering over the prebuilt index, used on `/practice`
- `concept-coverage.tsx` — Per-concept solved/total counts, used on the landing page
- `coming-soon.tsx` — The untranscribed remainder as a count and a year breakdown, at the foot of `/practice`

### API Layer
- `/api/grade` — Validates and rate-limits, reads the `llm` key server-side, calls Claude, returns `{ correct, reason }`. Cached on `(questionId, normalizedAnswer)`.
- `/api/help` — Request-time AI help, additive to the offline written ladder (a deliberate departure from `docs/project_spec.md`'s offline-only stance — see changelog Notes). Three modes: `hint` (escalating, XP-costed), `explain` (plain-language, free), `reveal` (answer keys for one part, no model call — this is how `llm` keys reach the client without ever sitting in the bundle). Zod-validated, rate-limited, cached.

### Library Modules
- `lib/grading.ts` — `exact` normalization (case, combining marks, whitespace, apostrophes). Pure, no network.
- `lib/progress.ts` — localStorage: `solved`, `xpEarned`, `hintsUsed`, `aiHintsUsed`, `selfGraded` per problem. Read via `useProgress`/`useProblemProgress`, `useSyncExternalStore` hooks over the raw storage — localStorage is the single source of truth, not copied into component state on mount
- `lib/timer.ts` — Start timestamp + duration, never an elapsed counter, so timing survives refresh. `useStoredTimer` follows the same `useSyncExternalStore` pattern as `lib/progress.ts`
- `lib/content.ts` — Loads records at build, filters to `published`, builds the filter index

### Content & Ingest
- `content/schema.ts` — Zod `Problem`/`Question`, imported by both the scripts and the site
- `content/taxonomy.ts` — Concept + form tag vocabulary (NACLO publishes none)
- `content/problems/*.json` — One published record per problem; `content/assets/` holds cropped figures. `tier` is `full` (playable) or `catalogue` (metadata, links out to the booklet). `publish.ts` decides which directory a record lands in, based on whether every pipeline gate cleared — not a human move
- `content/drafts/*.json` — the two per-pass drafts (`<id>.a.json`, `<id>.b.json`) `draft.ts` writes before `diff.ts` compares them. Machine output only; `lib/content.ts` never reads it
- `content/parked/*.json` — problems the pipeline could not vouch for, carrying a `_parkReasons` array of what disagreed or went unresolved. Committed on purpose: it is the human-review queue and is meant to be read as a diff. `lib/content.ts` reads neither it nor `content/drafts/`
- Two gates in `lib/content.ts`, not one. `getPublishedProblems()` is the review gate; `getPlayableProblems()` narrows it to `full` and is what `getProblemIndex()` maps over, so no count anywhere in the UI can quietly include a problem nobody can work. `getUpcoming()` returns the catalogue remainder as a total and a per-year tally, which is all the site says about it
- `scripts/ingest/manifest.ts` — booklet page maps and `pdftotext` parsers; hand-checked where the text layer is mojibake (2019)
- `scripts/ingest/run.ts` — orchestrates all seven pipeline stages for one or more years; `npm run ingest -- <year...> | --all | --dry`. Resumable — a re-run after an interruption skips drafts that already exist rather than paying for them twice
- `scripts/ingest/validate.ts` — Zod + assets + keys + glyph coverage, blocks the build; allowed `unicode-range`s come from `app/globals.css` so the fonts stay the single source of truth
- `scripts/ingest/sync-assets.ts` — copies `content/assets` to `public/content-assets`. Offline only, never at request time

## Design Decisions

- **No database.** A few hundred read-only records that change once a year get version history and diffable review for free from git.
- **`gradingMode` is per sub-question.** One problem routinely mixes a table to fill in with a rule to state; tagging at the problem level would force the harder case onto everything.
- **Directory plus `reviewStatus` gate the build.** `lib/content.ts` only reads `content/problems/`, filtered to `reviewStatus: 'published'`. `publish.ts` is what decides which directory a record lands in, based on whether every pipeline gate cleared — not a human sign-off.