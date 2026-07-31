# Project Status

This file will hold the project's development status and thus document whatever large updates/accomplishments on the project have been made day-by-day. It is meant to help keep track of where things were left off from the previous day, as a personal reminder.

## 2026-07-31 (later sessions)

**Done**

- Catalogued the whole 2018-2025 archive (`1da1ff5`): 64 records, of which 6 playable at the time. Added the `tier` field (`full` vs `catalogue`) so the archive is findable and filterable long before it is all transcribed
- Transcribed 2025 E and G (`156b865`); E needed Armenian, which surfaced the general problem below
- Attacked the throughput bottleneck (`9be9677`) three ways: a glyph-coverage gate in `validate.ts` that reads the allowed `unicode-range`s straight out of `globals.css`; 21 preloaded script font subsets; and `scripts/ingest/draft.ts`, the batch drafting pipeline the spec always called for but that had never been built
- Unlocked 2019 (`3fa47c2`). Both its booklets return a substitution cipher from `pdftotext`, but the cipher is consistent and the header furniture survives it, so scanning for `(X)` and `(n/m)` pins all eight problems to their pages without decoding a word of prose. Verified against the rendered page. Archive coverage 58 -> 66
- Drafted 10 problems in one batch run (2024 A, C, D, E and 2025 A, B, C, D, F, H): 10 drafted, 0 failed, ~112k input / ~148k output tokens, roughly $4 total, about 45 minutes unattended
- Reviewed and published 6 of them (`2a41643`): 2024 B, C, D and 2025 B, C, F. **Playable problems 8 -> 14, sub-questions 138 -> 232, 94% exact.** Every answer key was checked against the official solution pages rather than trusted from the draft
- Added the nasal-vowel font subset (`bddad7e`) for Tucano `kamrẽ` in 2025 C

**Where things stand**

The pipeline works end to end and the review step is now the only slow part, which is where the spec wants it. Drafting a problem costs about $0.40 and produces a record whose keys, in this batch, matched the official solutions cell for cell in all six cases checked. What the model does *not* get right without help is bounded and predictable: it invents its own question-id scheme, it reaches for arrows and ✔/✘ that no shipped font carries, and it cannot crop a figure. The first two are now prompt rules; the third is genuinely manual.

Two real bugs were caught by review rather than by validation, which is worth remembering when judging how far to trust a draft. 2025 B's B3 had `answerKey: "9"` against choices like `"9. to cross over"`, so every correct answer would have been marked wrong. And 2024 B graded a free English translation as `exact`, which would have failed a student who wrote "the dog lies on the horse" — it is now `llm`. Neither is visible to the schema.

Verified after the build that `llm` answer keys still do not reach the browser: the prerendered HTML for 2024 B carries exactly 8 `answerKey` fields for its 8 `exact` questions, and none for the `llm` one.

**Carried over / needs fixing**

- Five drafts await review in `content/drafts/` (2024 A, E and 2025 A, D, H). Every one needs at least one figure cropped from the source PDF. 2024 E additionally needs a katakana subset — the problem is *about* the script, so a missing glyph makes it unsolvable rather than ugly
- 2024 A also uses `⁹` (U+2079) for a medieval Latin abbreviation; `ꝯ` (U+A76F) is likely the right character and already sits inside a declared range, but the glyph's presence in the file has not been checked
- 40 archive problems (2018, 2019, 2020-2023, and the rest of 2024-2025) are still catalogue-only. `npm run draft -- <year>` handles a year at a time now
- `ANTHROPIC_API_KEY` still not set in Vercel, so AI help and `llm` grading degrade to a 503 in production. This now matters more: 14 `llm` sub-questions depend on it
- The Vercel project is still named `naclo-thing`, so the URL does not match `gloss.`
- `npm audit`: 12 high advisories, no fix available (3 nest under `next` itself)
- Still no visual verification by any agent — the site has only ever been checked by fetching HTML and reading the build output

**Next up**

1. Crop the six figures the five pending drafts need, then review and publish them
2. Add a katakana subset for 2024 E
3. Set `ANTHROPIC_API_KEY` in Vercel
4. Keep drafting year by year; 2023 was the originally chosen scope and is untouched

## 2026-07-31

**Done**

- Removed the dead `Geist`/`Geist_Mono` import from `app/layout.tsx` (`aeb6647`) — the site already rendered in the self-hosted faces, so these were only unread CSS variables plus a build-time Google Fonts fetch the spec's self-hosted requirement rules out
- Reconciled `CLAUDE.md` (`aeb6647`): dropped `app/exam/` from the architecture tree, "all three timing modes" now "both practice timing modes." `docs/project_spec.md`'s own stale "all three timing modes" line was not touched and is still outstanding
- Built AI help at the point of confusion (`2e3fca0`): new `app/api/help/route.ts`, the second server route, with three modes — `hint` (escalating level 1-3, prompted hard against revealing any answer), `explain` (plain-language rewrite of the reviewed explanation, grounded in it, for 12-17 year olds), and `reveal` (returns one part's answer keys, no model call)
- New `components/help-popover.tsx`: a "Stuck?" button beside every part opens the written hint ladder, AI hints, plain-word explanation, and answer reveal in one popover anchored to that part. Replaces and deletes `components/hint-ladder.tsx` (confirmed gone from the tree)
- XP: AI hints cost 2 XP each, capped at 3 per part; revealing a part zeroes that part's XP. `ProblemProgress` gained `aiHintsUsed`. Written hints unchanged at 1-3 XP and remain the cheaper default
- `lib/progress.ts` and `lib/timer.ts` gained `useSyncExternalStore`-based hooks (`useProgress`, `useProblemProgress`, `useStoredTimer`); components read localStorage directly instead of copying it into state on mount. Fixed four `react-hooks/set-state-in-effect` lint errors
- Found and fixed a live bug, not visible from reading the code: level-3 hints were returning 502s because `max_tokens: 300` was too low — the model spent the budget reasoning before it wrote anything, tripping the empty-text guard. Raised to 1000 for hints, 1600 for explain

**Where things stand**

AI help is live alongside the six published problems: a "Stuck?" popover per part offers written hints first, then optional AI hints (2 XP each, 3 per part) and a free plain-language explanation, then an answer reveal that zeroes that part's XP. `reveal` is also the mechanism that lets the 8 `llm`-graded Māori answer keys reach a student without ever sitting in the client bundle. This is a deliberate departure from `docs/project_spec.md`, which argues hints and explanations should be written offline because "a model holding the full solution tends to give too much away" — the written ladder stays the default, cheaper path, and its four offline-content reasons (consistency, human review before shipping, one-time cost, instant load) still apply to it. AI help is additive, for what the written ladder doesn't cover. `CLAUDE.md`'s content-integrity line ("Hints and explanations are written at ingest, never generated at request time") now contradicts this and has not been updated — same kind of staleness as the `app/exam/` line fixed earlier today, just not yet caught. `CLAUDE.md`'s architecture tree also still names `question-card.tsx`, `hint-ladder.tsx`, and `timer.tsx` — none of which match the actual files (`question-row.tsx`, `help-popover.tsx`, `practice-timer.tsx`) — and doesn't mention `app/api/help` at all.

**Carried over / needs fixing**

- `ANTHROPIC_API_KEY` is not set in Vercel's environment. Verified live: on production, both `/api/help` and `/api/grade` return a graceful 503 ("AI help is not set up. The written hints below still work.") instead of calling the model. Everything else on prod works, including `reveal`, which needs no key. Must be set in Vercel Settings → Environment Variables before AI hints, explain, or `llm` grading work in production
- `CLAUDE.md`'s content-integrity policy still says hints/explanations are never generated at request time, contradicting the new `/api/help` route; its architecture tree still lists deleted/renamed files and omits `/api/help` and `help-popover.tsx` entirely
- `docs/project_spec.md`'s Phase 1 slice description still says "all three timing modes" — unreconciled
- The Vercel project is still named `naclo-thing`, so the URL does not match `gloss.`
- 2024 and 2025 full exam PDFs in `pdfs/` are still un-ingested
- `npm audit`: 12 high advisories, no fix available (3 nest under `next` itself)
- No visual verification has been done by any agent — the live site has only been checked by fetching HTML. A browser MCP would close that gap

**Next up**

1. Reconcile `CLAUDE.md`'s content-integrity policy and architecture tree with what actually shipped (`/api/help`, `help-popover.tsx`, current component/lib file names)
2. Set `ANTHROPIC_API_KEY` in Vercel so AI help and `llm` grading work in production
3. Rename the Vercel project so the URL matches `gloss.`
4. Reconcile `docs/project_spec.md`'s remaining "all three timing modes" line
5. Decide whether and when to ingest the 2024 and 2025 exam PDFs already sitting in `pdfs/`

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
