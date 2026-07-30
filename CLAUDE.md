# CLAUDE.md
## Project Goals

**Current Milestone** MVP - website that takes NACLO past problems and practice sets from their website, turning it into a cohesive study platform

**Phase 1 Slice:** One full past exam (about 8 problems) taken end to end - transcribed, tagged, hint-laddered, explained, grading modes assigned, published — with practice mode, hints, explanations, and all three timing modes built over just those.

## Architecture Overview

Statically generated Next.js site over JSON content files. No database. Problem content is drafted offline in `scripts/ingest/` and human-reviewed before it ships; the only request-time AI is free-text grading.

```
naclo_tool/
├── app/                          # Next.js App Router, statically generated
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   ├── practice/                 # Concept filters + problem view
│   ├── exam/                     # Full timed past papers
│   └── api/grade/route.ts        # Only server route — AI free-text grading
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── problem-view.tsx          # Main orchestrator
│   ├── question-card.tsx         # Sub-question, branches on gradingMode
│   ├── hint-ladder.tsx           # Three tiers, in order, XP cost
│   └── timer.tsx                 # Countdown display
├── lib/
│   ├── grading.ts                # exact-match normalization
│   ├── progress.ts               # localStorage wrapper — solved, XP, hints
│   ├── timer.ts                  # Timestamp-based timing
│   └── content.ts                # Loads published problems, builds index
├── content/
│   ├── schema.ts                 # Zod schema, shared by pipeline and site
│   ├── taxonomy.ts               # Concept + form tag vocabulary
│   ├── problems/*.json           # One reviewed record per problem, in git
│   └── assets/                   # Cropped glyph specimens and diagrams
├── scripts/ingest/               # Run by hand, offline
│   ├── fetch.ts                  # Download PDFs from NACLO
│   ├── transcribe.ts             # PDF → Unicode HTML + real tables
│   ├── draft.ts                  # AI pass: tags, hints, explanation, grading
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
- No dark mode for MVP

**Component patterns:**
- Shadcn UI for all interactive elements (buttons, inputs, dialogs, tabs)
- Tailwind for layout and spacing
- Wide tables live in their own horizontally scrolling container — the page body never scrolls sideways
- Keep components focused and small

## UX Guidelines

**Core UX principles:**
- Help is available but never free: hints unlock in order, XP cost shown before reveal
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
- NEVER expose `ANTHROPIC_API_KEY` to the client — `/api/grade` server-side only
- Only `NEXT_PUBLIC_*` vars reach the browser; never prefix a secret with it
- NEVER commit `.env` or any file with API keys
- Validate, sanitize, and rate-limit every request to `/api/grade`
- Collect no personal information

**Content integrity — MUST Follow:**
- Only `published` records ship; unreviewed AI drafts never reach a student
- Hints and explanations are written at ingest, never generated at request time
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