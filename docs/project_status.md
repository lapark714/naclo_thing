# Project Status

This file will hold the project's development status and thus document whatever large updates/accomplishments on the project have been made day-by-day. It is meant to help keep track of where things were left off from the previous day, as a personal reminder.

## 2026-07-30

**Done**

- Scaffolded Next.js 16 (App Router, TypeScript, Tailwind, ESLint), `app/` at the repo root
- Replaced the boilerplate landing page with a coming-soon page; set real metadata in `app/layout.tsx`
- Deployed to production and verified it publicly: <https://naclo-thing.vercel.app>
- Renamed the site to `gloss.` (tab title and landing heading)
- Tidied the repo: `project_spec.md` and `brainstorm.md` moved into `docs/`, unused scaffold SVGs deleted, `public/` now empty
- Cleared pre-MVP blockers (`123ac6e`): `zod` and `@anthropic-ai/sdk` promoted to real dependencies, shadcn/ui initialised on the Radix base (`components.json`, `lib/utils.ts`, `app/globals.css` rewritten), `tsx` added with a working `npm run validate` over `scripts/ingest/validate.ts`, `package.json` renamed `naclo-scaffold` → `gloss`, `.env.example` added with a `!.env.example` gitignore exception
- Narrowed MVP scope to individual problems only; full timed exam mode deferred. `docs/architecture.md` updated (uncommitted): `app/exam/[examId]/page.tsx` dropped from the target tree, timer description no longer mentions a hard exam lock. `Problem` records keep `year`, `round`, `officialPoints`, `officialTimeMinutes` so exams can be assembled later without a schema change
- Downloaded the first source PDFs into `pdfs/` (gitignored): six problems, each with its official solution. Nothing ingested or transcribed yet
- Restored `CLAUDE.md` to real content (`dd773f0`): project goals, architecture tree, design style guide, UX guidelines, constraints, repo etiquette — no longer just `@AGENTS.md`
- Built the MVP (`b5bb883`): ingested NACLO 2026 Open problems A-F into `content/problems/*.json` — transcribed bodies (prose as HTML, data tables as real `<table>`, Rosetta pairs as `<dl class="gloss-list">`), 106 sub-questions with answer keys, three-tier hints with XP costs, worked explanations. Eleven figures cropped from the PDFs into `content/assets/` with `pdftoppm` (poppler via Homebrew, run by hand). All six records `reviewStatus: "published"`
- Answered the spec's open question: `npm run validate` reports 98 of 106 sub-questions (92%) grade `exact`, past the spec's 80% "AI grading is nearly optional" threshold. The other 8 are `llm` — all in problem F, Māori sentence translation. Zero `self`. `/api/grade` now serves exactly one problem's worth of questions
- Built the practice site: `app/practice/page.tsx` (client-side concept/difficulty filters over a build-time index), `app/practice/[problemId]/page.tsx` (statically generated per problem), `app/page.tsx` landing rewritten with per-concept coverage (`concept-coverage.tsx`)
- Built `app/api/grade/route.ts`, the only server route: Zod-validated body, per-IP rate limit, verdicts cached on `(questionId, normalizedAnswer)`, answer key read server-side
- Built `lib/grading.ts` (NFD normalization, strips combining marks), `lib/progress.ts` (localStorage), `lib/timer.ts` (timestamp + duration), `lib/content.ts` (build-time loader — filters to `published`, strips `llm` answer keys before anything reaches the client)
- Self-hosted Noto Sans, Noto Serif Display, and Charis SIL in `public/fonts/` (latin + latin-ext, ~880KB), wired into `app/globals.css` and used sitewide — closes the Geist-placeholder debt
- `npm run validate` now does real work (Zod schema, asset-existence, non-empty keys, choice-key-in-choices); `npm run sync-assets` copies `content/assets` → `public/content-assets`, wired as `predev`/`prebuild`
- Verified the deploy live: `/`, `/practice`, and all six problem pages return 200 anonymously at https://naclo-thing.vercel.app

**Deployment notes — four separate gates had to clear**

1. Vercel's GitHub App lacked access to the repo, so no branches appeared
2. Commits carried a fabricated author email (`laurence@MacBook-Air-3.local`); Vercel refuses those. Fixed with `git config --global user.email` plus a new commit — history keeps the old address
3. Deployment Protection was on, redirecting anonymous visitors to a Vercel login
4. The project had no Framework Preset, so `next build` ran and passed but the output was served as a static folder, returning 404 on a green build. Pinned in `vercel.json`

**Where things stand**

The MVP is live and has real content. Six NACLO 2026 Open problems (A-F), 106 sub-questions, all `published`: 98 grade `exact` in the browser, 8 (problem F only, Māori sentence translation) go through `/api/grade`. Practice mode, hints, timer, and localStorage progress are built. Fonts are self-hosted (Noto Sans / Noto Serif Display / Charis SIL) and wired sitewide. MVP scope stays individual-problems-only — no exam assembly, no accounts, no leaderboards. `content/` holds only these six 2026 Open records; the rest of `pdfs/` (2024 and 2025 full exams) is untouched.

**Carried over / needs fixing**

- The Vercel project is still named `naclo-thing`, so the URL does not match the `gloss.` name. Renaming it changes the URL, so do it before sharing the link widely
- 2024 and 2025 full exam PDFs in `pdfs/` are not ingested — content is six problems from one year only
- `npm audit`: 12 high-severity advisories, unchanged. Most are the ESLint toolchain (`brace-expansion`/`minimatch`), devDependencies only. Three (`postcss`, `sharp`, `next`) are nested under `next` itself, a production dependency — `npm audit fix --force` is the only offered fix and it proposes downgrading to `next@9.3.3`, not viable. Deliberately left, but worth a second look since it's not purely a dev-tooling issue
- `app/layout.tsx` still imports `Geist`/`Geist_Mono` from `next/font/google` and applies them as CSS variables on `<html>`, but nothing reads those variables now that `body`/`.problem-body` are hardcoded to Noto Sans/Charis SIL in `app/globals.css` — dead code left from the scaffold
- `CLAUDE.md` was restored (`dd773f0`) but its architecture tree and Phase 1 slice description still mention `app/exam/` and "all three timing modes," contradicting the MVP-scope narrowing recorded the same day in `docs/architecture.md` — needs reconciling
- `docs/project_spec.md`'s Phase 1 slice description still says "all three timing modes" — same staleness, still unreconciled

**Next up**

1. Rename the Vercel project so the URL matches `gloss.`
2. Reconcile `CLAUDE.md` and `docs/project_spec.md` against actual MVP scope (drop `app/exam/` / "all three timing modes," or explicitly re-scope)
3. Decide whether and when to ingest the 2024 and 2025 exam PDFs already sitting in `pdfs/`
4. Remove the unused Geist font import from `app/layout.tsx`

## 2026-07-29

**Done**

- Rewrote `CLAUDE.md` down to the must-have rules: goals, target architecture tree, design style guide, UX guidelines, constraints, repo etiquette
- Wrote `docs/architecture.md`: system overview, ingest and request-time data flows, component and library map, design decisions
- Set up `docs/changelog.md` and this file
- Confirmed `.env` is untracked and gitignored; env vars in place for the API key, models, and grading rate limit

**Where things stand**

Planning and documentation are done. There is no application code yet: no `package.json`, no Next.js scaffold, no content records. Every path in the architecture tree is a target, not a file that exists.

**Next up**

1. Sample one past exam and count what fraction of sub-questions can grade with `exact`. This is the spec's open question and it decides how much the `/api/grade` route actually matters. About an hour of work, and it belongs before anything gets built.
2. Scaffold Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, and add the `lint` / `build` / `validate` npm scripts referenced in `CLAUDE.md`.
3. Write `content/schema.ts` from the Zod model in `docs/project_spec.md`, plus `content/taxonomy.ts` for the concept and form tag vocabulary.
4. Start the Phase 1 slice: transcribe one problem end to end and time it, since that number decides whether the full archive is a month of work or a year.
