# Architecture

High-level system architecture, data flow, and component relationships for the NACLO Prep Platform.

## System Overview

A statically generated Next.js site over reviewed JSON content files, with no database. NACLO PDFs are processed offline into problem records, a person reviews each one, and the build turns `published` records into static pages. AI runs in two separate places: offline it drafts content a human then reviews, and at request time it grades free text in `/api/grade` — the only server route.

## Data Flow

### Ingest — offline, by hand (no `fetch`/`transcribe`/`draft` scripts exist yet)

```
problem PDF + solution PDF        → /pdfs (gitignored), downloaded by hand
   ↓  transcribed by hand         → Unicode HTML, real <table> markup;
                                    figures cropped with pdftoppm → content/assets/
content/problems/<id>.json                              reviewStatus: 'published'
   ↓  validate.ts                 → Zod + assets + keys. Blocks the build.
   ↓  sync-assets.ts              → content/assets → public/content-assets (predev/prebuild)
```

### Attempt — request time

```
/practice + filters  →  static page, prerendered from published records
   ↓  submit a sub-question answer, branch on gradingMode
      exact  →  lib/grading.ts normalizes both sides in-browser. No network.
      llm    →  POST /api/grade → key read server-side → Claude → { correct, reason }
      self   →  reveal key + rubric, student records own verdict
   ↓  lib/progress.ts → localStorage. Explanation unlocks after the attempt.
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
- `hint-ladder.tsx` — Three tiers in order, XP cost shown before reveal
- `practice-timer.tsx` — Timestamp-based display; banner at expiry, input stays live
- `concept-filter.tsx` — Client-side filtering over the prebuilt index, used on `/practice`
- `concept-coverage.tsx` — Per-concept solved/total counts, used on the landing page

### API Layer
- `/api/grade` — The only server code. Validates and rate-limits, reads the `llm` key server-side, calls Claude, returns `{ correct, reason }`. Cached on `(questionId, normalizedAnswer)`.

### Library Modules
- `lib/grading.ts` — `exact` normalization (case, combining marks, whitespace, apostrophes). Pure, no network.
- `lib/progress.ts` — localStorage: `solved`, `xpEarned`, `hintsUsed`, `selfGraded` per problem
- `lib/timer.ts` — Start timestamp + duration, never an elapsed counter, so timing survives refresh
- `lib/content.ts` — Loads records at build, filters to `published`, builds the filter index

### Content & Ingest
- `content/schema.ts` — Zod `Problem`/`Question`, imported by both the scripts and the site
- `content/taxonomy.ts` — Concept + form tag vocabulary (NACLO publishes none)
- `content/problems/*.json` — One reviewed record per problem; `content/assets/` holds cropped figures
- `scripts/ingest/validate.ts` — Zod + assets + keys, blocks the build. `scripts/ingest/sync-assets.ts` — copies `content/assets` to `public/content-assets`. Both offline only, never at request time.

## Design Decisions

- **No database.** A few hundred read-only records that change once a year get version history and diffable review for free from git.
- **`gradingMode` is per sub-question.** One problem routinely mixes a table to fill in with a rule to state; tagging at the problem level would force the harder case onto everything.
- **`reviewStatus` gates the build.** It is the single mechanism keeping unreviewed AI output away from students.