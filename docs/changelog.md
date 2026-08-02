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
- `app/api/grade/route.ts`, the first server route (a second, `/api/help`, followed later — see below): Zod-validated request body, per-IP rate limit, verdicts cached on `(questionId, normalizedAnswer)`, reads the answer key server-side and calls Claude for the 8 `llm` sub-questions (all in problem F, Māori sentence translation)
- `lib/grading.ts` (`exact` matching: NFD normalization, strips combining marks so a student without an accent key isn't punished), `lib/progress.ts` (localStorage), `lib/timer.ts` (timestamp + duration), `lib/content.ts` (build-time loader — filters to `published`, strips `llm` answer keys before anything reaches the client)
- Components: `problem-view.tsx`, `question-row.tsx`, `hint-ladder.tsx`, `practice-timer.tsx`, `concept-filter.tsx`, `concept-coverage.tsx`
- Self-hosted Noto Sans, Noto Serif Display, and Charis SIL in `public/fonts/` (latin + latin-ext, ~880KB); English UI set in Noto Sans, primary language data in Charis SIL
- `app/page.tsx` landing page rewritten with per-concept coverage (`concept-coverage.tsx`)
- `app/api/help/route.ts`: second server route, AI help anchored per part. Three modes: `hint` (escalating level 1-3, prompted hard against revealing any answer), `explain` (plain-language rewrite of the reviewed explanation, grounded in it, aimed at 12-17 year olds), and `reveal` (returns the answer keys for one part — no model call). Zod-validated, rate-limited, cached
- `components/help-popover.tsx`: a "Stuck?" button beside every part opens a popover with the written hint ladder, AI hints, plain-word explanation, and the answer reveal, so help sits where the student is stuck instead of only at the foot of the page
- `ProblemProgress.aiHintsUsed` field, tracking request-time AI hints separately from written ones
- `useProgress`, `useProblemProgress` (`lib/progress.ts`) and `useStoredTimer` (`lib/timer.ts`): `useSyncExternalStore`-based hooks reading localStorage directly, replacing on-mount copies into component state
- Content tier system (`1da1ff5`): `Problem.tier` is `full` (playable) or `catalogue` (metadata only, links out to the booklet). A Zod `superRefine` exempts catalogue records from the questions/hints/body/explanation requirements, so the archive can be findable long before it is all transcribed without pretending a catalogue entry is a practice problem
- Catalogued the 2018-2025 archive into `content/problems/*.json` (`1da1ff5`), then transcribed 2025 E and G (`156b865`)
- `scripts/ingest/draft.ts` (`npm run draft`, `9be9677`): the spec's missing `draft` step. Maps every archive problem to its booklet pages, renders them with `pdftoppm`, sends problem + official solution images to Claude, and writes a full draft record to `content/drafts/`. `--list`, an id (`2024-B`), a year, or `--all`. Drafts never land in `content/problems/` — promotion stays a human act
- Glyph-coverage gate in `scripts/ingest/validate.ts` (`9be9677`): every character of every record is checked against the `unicode-range` declarations parsed out of `app/globals.css`, so the fonts are the single source of truth and a script with no coverage fails the build instead of rendering tofu. Records in `content/drafts/` are checked too, but warn rather than block
- Font subsets for the archive's scripts (`9be9677`, `bddad7e`): Armenian, Devanagari, Georgian, Cherokee, Ethiopic, N'Ko, Greek, Cyrillic, and the nasal-vowel block (`U+1EA0-1EF9` plus combining tilde). Consolidated into one `--data-stack` CSS variable. Unused subsets cost visitors zero bytes
- 2019 added to the draft manifest (`3fa47c2`): its booklets embed a broken ToUnicode map, but the header furniture survives the cipher (`(` is U+037E, `)` is U+037F, digit `d` is U+03EC+d), which pins all eight problems to their pages. Archive coverage 58 -> 66 problems
- Published 2024 B, C, D and 2025 B, C, F (`2a41643`), then 2024 A, E and 2025 A, D, H (`07ca56b`), clearing the drafts queue. 19 problems playable, 294 sub-questions at 95% exact; 2025 complete at all eight
- Katakana subset (`4f273de`) for 2024 E, and ten figures cropped from the source PDFs (`f5a7fe6`). The 2024 E semaphore strips are cut per table row — found by detecting the table's rules in the render rather than by eye — so they sit in the real table beside real katakana text
- Published all eight 2023 problems and 2024 F, G, H. **30 problems playable, 441 sub-questions at 97% exact; 2023 through 2026 complete.** Four figures cropped (the nine vloxes for 2023 C, three card sets for 2024 G)
- Per-problem author bylines for 2023 and 2024 F-H, read off the credits page of each booklet
- `components/coming-soon.tsx` and `getUpcoming()` in `lib/content.ts`: the untranscribed remainder is stated once at the foot of `/practice` as a count and a year breakdown
- A global `u` rule in `app/globals.css` with `text-underline-offset: 0.3em`, so a booklet's syllable-nucleus underlining clears an ogonek instead of colliding with it
- A line between the problem body and the timer pointing at the answer boxes. A booklet prints its blanks as bare letters in a table cell, so a student read "fill in a. to g." with nothing on screen to fill in and no sign the inputs were a thousand pixels below
- A note in the questions header, shown only when some answer needs a letter a US keyboard lacks, saying the plain spelling counts and accents can be dropped. This was already true of all 21 such questions and nothing said so
- Typeable-answer gate in `scripts/ingest/validate.ts`: an `exact` typed answer whose key and every accepted variant need a non-ASCII letter fails the build. Grading forgives accents but not distinct letters, so a key of `þu` with no `thu` variant is unanswerable however well it is solved

### Changed

- Renamed the site to `gloss.` — browser title in `app/layout.tsx`, landing heading in `app/page.tsx`
- Moved `project_spec.md` and `brainstorm.md` into `docs/`, leaving only tooling-required config at the repo root
- `.gitignore` broadened from `.env` to `.env*`
- `package.json` `name` changed from `naclo-scaffold` to `gloss`
- MVP scope narrowed to individual problems only; full timed exam mode deferred (`docs/architecture.md`). Removed `app/exam/[examId]/page.tsx` from the target tree and the hard-lock behavior from the timer description. `Problem` records still carry `year`, `round`, `officialPoints`, `officialTimeMinutes`, so whole papers can be assembled later without a schema change
- `CLAUDE.md` reconciled with the MVP-scope narrowing: dropped `app/exam/` from the architecture tree, "all three timing modes" now reads "both practice timing modes"
- XP: AI hints cost 2 XP each and are capped at 3 per part; revealing a part's answers zeroes that part's XP for scoring. Written hints unchanged at 1-3 XP and remain the default, cheaper path
- `/practice` lists playable problems only. Catalogue entries no longer appear as rows marked "not yet transcribed"; they are counted in a "More problems coming soon" section instead. `getProblemIndex()` now returns `full`-tier records only, so the landing-page problem count, the language count, and every per-concept coverage denominator describe what a student can actually work. Their pages are still generated and still link out to the booklet — nothing links to them
- The "playable now" filter chip is gone from `concept-filter.tsx`, since every listed problem is now playable

### Removed

- Unused create-next-app SVGs from `public/` (`file`, `globe`, `next`, `vercel`, `window`)
- `app/layout.tsx`'s dead `Geist`/`Geist_Mono` import from `next/font/google` — exposed CSS variables nothing read, and its removal also drops a build-time Google Fonts fetch that the spec's self-hosted-font requirement rules out
- `components/hint-ladder.tsx`, folded into `help-popover.tsx`

### Fixed

- Self-hosted fonts wired into `app/globals.css` (`body { font-family: "Noto Sans" }`, `.problem-body` etc. use Charis SIL) and used sitewide, closing the Geist-placeholder debt
- `CLAUDE.md` restored to real content (`dd773f0`, prior to this build): goals, architecture tree, design style guide, UX guidelines, constraints, repo etiquette. No longer just `@AGENTS.md`
- Level-3 AI hints were returning 502s: `max_tokens: 300` on `/api/help` was too low, the model spent the budget reasoning before it emitted text, and the empty-text guard threw. Raised to 1000 for hints and 1600 for explain. Found by testing the live route, not by reading the code
- Four `react-hooks/set-state-in-effect` lint errors fixed by moving `lib/progress.ts` and `lib/timer.ts` onto `useSyncExternalStore`; components no longer copy localStorage into state on mount

### Notes

- Grading-mode split holds as the library grows: `npm run validate` now reports 232 sub-questions across 64 records, 218 `exact` / 14 `llm` / 0 `self` (94%), still past the spec's 80% "AI grading is nearly optional" threshold. 14 problems are playable, 50 are catalogue entries.
- Correct is not always right. 2024 A's medieval shorthand has two 9-shaped signs, and `ꝯ` U+A76F is genuinely the character for the baseline one — but that problem's symbol bank lists it as entry 21 typed as a plain digit, and its answers are sequences of bank numbers, so the shape in the word has to match the shape in the bank. The PDF's own notation wins over the palaeographically proper character.
- A `unicode-range` is a promise the font has to keep. Widening a range to cover a character the woff2 does not contain passes validation and still renders a box, which is strictly worse than failing the build — no font we ship carries U+2192, so drafts are told to write "gives" instead of reaching for an arrow. New subsets are verified against the file's cmap, not just declared.
- The spec's open question is answered: `npm run validate` reports 98 of 106 sub-questions (92%) grade `exact`, past the spec's 80% "AI grading is nearly optional" threshold. The other 8 are `llm`, all in problem F (Māori sentence translation); zero `self`. `/api/grade` currently serves only that one problem's worth of questions.
- `npm audit`: 12 high-severity advisories. 9 trace through the ESLint toolchain (`brace-expansion`/`minimatch`), devDependencies only, never shipped. The other 3 (`postcss`, `sharp`, `next` itself) are nested under `next`, a production dependency — `sharp` is next's optional image-optimization dep, `postcss` is next's own internal copy (build-time only). `npm audit fix --force` is the only fix path offered, and it proposes downgrading to `next@9.3.3`, which is not viable. Deliberately left; worth a closer look since it touches a prod dependency, not just dev tooling.
- Request-time AI help (`/api/help`) is a deliberate departure from `docs/project_spec.md`, which says hints and explanations are written offline because "a model holding the full solution tends to give too much away." The reviewed written ladder stays the default and is cheaper in XP; AI help is an addition for what the written ladder can't cover. The spec's four reasons for offline content still hold for the written ladder itself. `CLAUDE.md`'s "Hints and explanations are written at ingest, never generated at request time" line is now stale against this and needs reconciling, same as the `app/exam/` staleness fixed this round.
- `reveal` mode is also how `llm`-graded answers can be shown without shipping them in the client bundle: the 8 Māori answer keys are verifiably absent from the static HTML and arrive only when a student asks for them.
