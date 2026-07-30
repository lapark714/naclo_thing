# Change Log

All notable changes to the NACLO prep tool will be documented in this file

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

## [Unreleased]

### Added

- Next.js 16 scaffold (App Router, TypeScript, Tailwind, ESLint) with `app/` at the repo root
- Coming-soon landing page at `app/page.tsx`, prerendered as static; site metadata set in `app/layout.tsx`
- `vercel.json` pinning the framework preset to `nextjs`
- First production deploy: <https://naclo-thing.vercel.app>
- `CLAUDE.md`: project goals, target architecture tree, design style guide, UX guidelines, constraints, and repo etiquette
- `docs/architecture.md`: system overview, both data flows (offline ingest and request-time attempt), and the component map
- `docs/changelog.md` and `docs/project_status.md`
- `.env` config for `ANTHROPIC_API_KEY`, ingest and grading models, and the `/api/grade` rate limit
- `.gitignore` coverage for `.env` and the downloaded `/pdfs` directory
- `zod` and `@anthropic-ai/sdk` declared as real dependencies in `package.json` (zod was previously only transitive)
- shadcn/ui initialised on the Radix base: `components.json`, `lib/utils.ts`, `app/globals.css` rewritten to the shadcn token setup
- `tsx` added; `npm run validate` runs `scripts/ingest/validate.ts`
- `.env.example` added, with a `!.env.example` negation in `.gitignore` so it stays tracked despite the broader `.env*` ignore
- First source PDFs downloaded into `pdfs/` (gitignored): six problems from NACLO 2026, each with its official solution (Problems 1-6)
- `content/schema.ts` (Zod `Problem`/`Question`) and `content/taxonomy.ts` (concept + form tag vocabulary)
- Ingested NACLO 2026 Open problems A-F into `content/problems/*.json`: transcribed bodies (prose as HTML, data tables as real `<table>`, Rosetta pairs as `<dl class="gloss-list">`), 106 sub-questions with answer keys, three-tier hints with XP costs, worked explanations. All six records are `reviewStatus: "published"`
- Eleven figures cropped from the source PDFs into `content/assets/` (`pdftoppm` region crops; poppler installed via Homebrew for this, not wired into any script)
- `scripts/ingest/validate.ts` now does real work: Zod schema check, referenced-asset-exists-on-disk check, non-empty-answer-key check, and choice-question-key-is-among-its-choices check. Run: `6 record(s) valid · 6 published · 106 sub-questions (98 exact, 8 llm, 0 self — 92% exact)`
- `scripts/ingest/sync-assets.ts` (`npm run sync-assets`) copies `content/assets` → `public/content-assets`; wired as `predev` and `prebuild`. `public/content-assets` gitignored as generated
- `app/practice/page.tsx`: client-side concept/difficulty filters over a build-time index
- `app/practice/[problemId]/page.tsx`: statically generated page per problem
- `app/api/grade/route.ts`: the only server route — Zod-validated request body, per-IP rate limit, verdicts cached on `(questionId, normalizedAnswer)`, reads the answer key server-side and calls Claude for the 8 `llm` sub-questions (all in problem F, Māori sentence translation)
- `lib/grading.ts` (`exact` matching: NFD normalization, strips combining marks so a student without an accent key isn't punished), `lib/progress.ts` (localStorage), `lib/timer.ts` (timestamp + duration), `lib/content.ts` (build-time loader — filters to `published`, strips `llm` answer keys before anything reaches the client)
- Components: `problem-view.tsx`, `question-row.tsx`, `hint-ladder.tsx`, `practice-timer.tsx`, `concept-filter.tsx`, `concept-coverage.tsx`
- Self-hosted Noto Sans, Noto Serif Display, and Charis SIL in `public/fonts/` (latin + latin-ext, ~880KB); English UI set in Noto Sans, primary language data in Charis SIL
- `app/page.tsx` landing page rewritten with per-concept coverage (`concept-coverage.tsx`)

### Changed

- Renamed the site to `gloss.` — browser title in `app/layout.tsx`, landing heading in `app/page.tsx`
- Moved `project_spec.md` and `brainstorm.md` into `docs/`, leaving only tooling-required config at the repo root
- `.gitignore` broadened from `.env` to `.env*`
- `package.json` `name` changed from `naclo-scaffold` to `gloss`
- MVP scope narrowed to individual problems only; full timed exam mode deferred (`docs/architecture.md`). Removed `app/exam/[examId]/page.tsx` from the target tree and the hard-lock behavior from the timer description. `Problem` records still carry `year`, `round`, `officialPoints`, `officialTimeMinutes`, so whole papers can be assembled later without a schema change

### Removed

- Unused create-next-app SVGs from `public/` (`file`, `globe`, `next`, `vercel`, `window`)

### Fixed

- Self-hosted fonts wired into `app/globals.css` (`body { font-family: "Noto Sans" }`, `.problem-body` etc. use Charis SIL) and used sitewide, closing the Geist-placeholder debt. `app/layout.tsx` still imports and applies `Geist`/`Geist_Mono` from `next/font/google` as unused CSS variables — dead code left over from the scaffold, not yet removed.
- `CLAUDE.md` restored to real content (`dd773f0`, prior to this build): goals, architecture tree, design style guide, UX guidelines, constraints, repo etiquette. No longer just `@AGENTS.md`. Note: the restored tree still lists `app/exam/` and "all three timing modes," which is stale against the same day's MVP-scope narrowing (`docs/architecture.md`) — needs reconciling.

### Notes

- The spec's open question is answered: `npm run validate` reports 98 of 106 sub-questions (92%) grade `exact`, past the spec's 80% "AI grading is nearly optional" threshold. The other 8 are `llm`, all in problem F (Māori sentence translation); zero `self`. `/api/grade` currently serves only that one problem's worth of questions.
- `npm audit`: 12 high-severity advisories. 9 trace through the ESLint toolchain (`brace-expansion`/`minimatch`), devDependencies only, never shipped. The other 3 (`postcss`, `sharp`, `next` itself) are nested under `next`, a production dependency — `sharp` is next's optional image-optimization dep, `postcss` is next's own internal copy (build-time only). `npm audit fix --force` is the only fix path offered, and it proposes downgrading to `next@9.3.3`, which is not viable. Deliberately left; worth a closer look since it touches a prod dependency, not just dev tooling.
