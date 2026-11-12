# CLAUDE.md
## Project Goals

**Current Milestone** MVP - website that takes NACLO past problems and practice sets from their website, turning it into a cohesive study platform

**Phase 1 Slice:** One full past exam (about 8 problems) taken end to end - transcribed, tagged, hint-laddered, explained, grading modes assigned, published — with practice mode, hints, explanations, and both practice timing modes built over just those. Individual problems only — full timed exam mode is deferred.

## Architecture Overview

Statically generated Next.js site over JSON content files. No database. Problem content is drafted offline in `scripts/ingest/` by two independent model passes, cross-checked against each other and against the booklet's own text layer before it ships; the only request-time AI is free-text grading.

```
naclo_tool/
├── app/                          # Next.js App Router, statically generated
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   ├── practice/                 # Concept filters + problem view
│   ├── api/grade/route.ts        # AI free-text grading
│   └── api/help/route.ts         # AI hints, plain-word explanations, reveal
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── problem-view.tsx          # Main orchestrator
│   ├── question-row.tsx          # Sub-question, branches on gradingMode
│   ├── help-popover.tsx          # Per-part help: hints, AI, reveal
│   ├── practice-timer.tsx        # Countdown display
│   ├── concept-filter.tsx        # Client-side filtering
│   ├── concept-coverage.tsx      # Per-concept progress
│   ├── coming-soon.tsx           # Untranscribed remainder, count + year breakdown
│   ├── home-demo.tsx             # Playable demo question on the landing page
│   ├── inline-answer.tsx         # Answer input rendered inside the problem body
│   └── use-answer.ts             # Grading hook shared by inline and row inputs
├── lib/
│   ├── grading.ts                # exact-match normalization
│   ├── progress.ts               # localStorage via useSyncExternalStore
│   ├── timer.ts                  # Timestamp-based timing
│   └── content.ts                # Loads published problems, builds index
├── content/
│   ├── schema.ts                 # Zod schema, shared by pipeline and site
│   ├── taxonomy.ts               # Concept + form tag vocabulary
│   ├── problems/*.json           # Published records, in git
│   ├── parked/*.json             # Records the pipeline couldn't vouch for; human review queue
│   └── assets/                   # Cropped glyph specimens and diagrams
├── scripts/ingest/               # Consensus pipeline, run by hand offline — see docs/architecture.md
│   ├── manifest.ts               # Pins page/points/author facts from the booklet's text layer
│   ├── draft.ts                  # Two model passes per problem, different dpi and reading order
│   ├── diff.ts                   # Compares the two passes on fact only
│   ├── witness.ts                # Checks language data against the text layer
│   ├── arbitrate.ts              # One model call per disagreement
│   ├── figures.ts                # Crops figures, confirms, retries
│   ├── fonts.ts                  # Fetches font subsets for uncovered scripts
│   ├── publish.ts                # Publishes clean records, parks the rest
│   └── validate.ts               # Zod + assets + answer keys, blocks the build
├── public/fonts/                 # Self-hosted Noto Sans + Charis SIL for IPA
└── docs/                         # Project documentation
```

## Design Style Guide

**Tech stack:** Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui

**Visual style:**
- Clean, minimal interface — the problem text and its tables are the star
- Responsive design (desktop-first — most students study on their computers)
- Self-hosted fonts must cover IPA and non-Latin scripts; a missing-glyph box breaks the problem
- One theme, dark. The ground is navy `#0d1b2a`; `:root` declares `color-scheme: dark` — keep that declaration so the browser's own scrollbars and form controls match the page
- The ground is the one part of the palette that is not NACLO's. The two brand hues are; navy is borrowed from the edtech reference. Both hues set type at full strength here, which they could not do on white
- There is no theme toggle and no second column. A light theme would be a second column restored, not a `.dark` class
- Solve every ratio against the worst ground a token can land on, not against `--paper`. `--tint` and the opacity composites over it are grounds
- NEVER `filter: invert()` a problem figure. At least one problem's answer is which robe is white and which is black. On the dark ground figures sit on a white mat with a rule, which frames the brightness as deliberate

**Component patterns:**
- Shadcn UI for all interactive elements (buttons, inputs, dialogs, tabs)
- Tailwind for layout and spacing
- Wide tables live in their own horizontally scrolling container — the page body never scrolls sideways
- Keep components focused and small

## UX Guidelines

**Core UX principles:**
- Help is available but never free: hints unlock in order, cost shown before reveal
- Untimed by default; timers are an opt-in pacing tool, not a punishment
- Practice never cuts you off: banner at expiry, input stays live. Exam mode locks.
- Show coverage per concept ("Morphology 6/14"), not a lifetime point total
- Every problem carries its author byline and links to the original NACLO PDFs

**Copy tone:**
- Plain and encouraging: written for a 12–17 year old, often on their first problem
- Brief labels and instructions; no linguistics jargon without a plain-English gloss
- Errors say what to do next, and AI grading verdicts can always be flagged as wrong

## Constraints & Policies

**Security — MUST Follow:**
- NEVER expose `ANTHROPIC_API_KEY` to the client — server routes only
- Only `NEXT_PUBLIC_*` vars reach the browser; never prefix a secret with it
- NEVER commit `.env` or any file with API keys
- Validate, sanitize, and rate-limit every request to `/api/grade` and `/api/help`
- Collect no personal information

**Content integrity — MUST Follow:**
- A record publishes only when its two independent transcription passes agree, the booklet's own text layer confirms the language data, and `validate.ts` is clean; anything else parks in `content/parked/`, which the site never loads
- Human review is no longer on the publish path. It is a follow-on pass over the parked queue and over answers students flag as wrong
- The written hints and explanations are authored at ingest by the drafting pass. They are not cross-checked the way facts are, because two passes never word prose alike; what replaces consensus for them is that a hint naming a graded answer parks the problem. `/api/help` adds request-time AI hints on top; it never replaces them, is prompted against revealing answers, and costs more points than the written ladder
- `llm` answer keys stay server-side; only `exact` keys ship in the content bundle
- `validate.ts` blocks the build — never bypass it

**Code quality:**
- TypeScript strict mode
- Run `npm run lint` before committing
- No `any` types without justification

## Repository Etiquette

**Branching**
- Small, safe changes go straight to `main`
- Branch for anything risky or spanning multiple sessions: `feature/description` or `fix/description`
- Merge back once it builds clean, then delete the branch
- NEVER force push to `main`

**Commits:**
- One logical change per commit; say what changed and why
- Keep content records (`content/problems/*.json`) in their own commits, separate from code — the point of JSON in git is a readable diff to review

**Documentation — after every milestone or major addition:**
- Add the change to `docs/changelog.md`
- Log the day's progress and where things were left off in `docs/project_status.md`
- Update `docs/architecture.md` whenever the structure or data flow changes

**Before pushing:**
1. `npm run lint`
2. `npm run build` — catches type errors
3. `npm run validate` — content records against the Zod schema
4. Open it in the browser: `npm run dev` at localhost:3000