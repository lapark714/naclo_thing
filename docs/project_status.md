# Project Status

This file will hold the project's development status and thus document whatever large updates/accomplishments on the project have been made day-by-day. It is meant to help keep track of where things were left off from the previous day, as a personal reminder.

## 2026-08-03

**Done**

- Built a consensus ingest pipeline that replaces human review as the publish gate. `manifest.ts` pins page spans, official points, and author bylines straight off each booklet's own text layer, so the model never owns a fact machine-readable text already states. `draft.ts` drafts every problem twice — pass A at 150dpi, reading tables strictly cell by cell; pass B at 300dpi, reading each page holistically first — because two passes that fail differently give the rest of the pipeline something to check. `diff.ts` compares the two drafts on fact only (keys, grading modes, points, choices, figure counts), skipping hints, explanations, and invented answer variants, since those are prose a model will always word two different ways. `witness.ts` checks language data against the booklet's own text layer, which can't repeat a misreading the way a second model pass can. `arbitrate.ts` spends one model call per disagreement, given the page image and the extracted text, and answers UNRESOLVED rather than guess when the evidence isn't clear. `figures.ts` crops automatically with a confirm-and-retry loop, up to three attempts. `fonts.ts` fetches a Noto subset from the Google Fonts CSS API for any script the corpus introduces. `publish.ts` publishes only a record with zero flags and parks everything else in `content/parked/` with its reasons attached. `run.ts` orchestrates all seven stages per year and writes a dated report to `docs/ingest-runs/`
- 2019 is never auto-published, by policy, no matter what its two passes agree on. Its booklets return a substitution cipher, so there is no witness check to catch a correlated misread, and two passes agreeing with each other is not evidence when neither had anything independent to be wrong against. It is still drafted and diffed, so what a human eventually reviews is a short check against real candidate answers rather than a transcription from scratch
- Ran the pipeline for real for the first time, on 2016 Open Round: [COUNT NEEDED — published vs. parked, and a one-line reason per parked problem]. The run report lives in `docs/ingest-runs/2026-08-03.md` and is what later years' park/publish decisions get judged against
- Reconciled the site's copy and the project docs with what the pipeline actually does, now that publishing no longer waits on a person. `app/page.tsx`'s guarantee under the call to action no longer promises a human check before anything ships; it now says what is actually true — two independent transcriptions cross-checked against NACLO's official solutions, and any answer flaggable as wrong. `CLAUDE.md`'s content-integrity rules and architecture tree, `PRODUCT.md`'s process description and one stale "current behaviour" bullet, and `docs/architecture.md`'s whole ingest data-flow diagram were rewritten to match. `CLAUDE.md`'s tree had also drifted on its own, independent of this change: missing components (`coming-soon.tsx`, `home-demo.tsx`, `inline-answer.tsx`, `use-answer.ts`) and `content/parked/`, and a `scripts/ingest/` listing that still named the four original files instead of the pipeline's real modules

**Where things stand**

The pipeline runs end to end and is unit-tested stage by stage (`tests/ingest/*.test.ts`). The target corpus is 2016-2022, which predates the archive's already-published, human-reviewed 2023-2026 span; this pipeline does not touch or re-run those years. The first real run, on 2016, parked most of what it attempted; every park looked legitimate on inspection — a swapped answer pair, hints that named their own graded answer, a pass that produced no table at all, and genuine disagreements about how an answer should be written down. That is closer to what "working as designed" looks like than a pipeline that publishes everything: park is the default failure mode on purpose, since an unresolved disagreement reaching a student is the expensive mistake and a parked problem waiting for a person is the cheap one.

The problem-count, sub-question-count, and grading-split figures in `PRODUCT.md`'s Capabilities and Evidence sections describe only the pre-pipeline archive and were deliberately left untouched this round rather than guessed — they need a real update once more years finish running, not before.

**Carried over / needs fixing**

- 2017 through 2022 still need a pipeline run
- The parked queue from the 2016 run needs an actual human review pass — nothing has looked at `content/parked/2016-open-*.json` yet beyond the pipeline's own flags
- `PRODUCT.md`'s Capabilities/Evidence counts and its exact/llm grading-split figure will be stale as soon as a second year publishes; hold off updating them until the runs are done
- `CLAUDE.md`'s content-integrity bullet on written hints/explanations still says they are "human-reviewed," which is no longer guaranteed for a record the consensus pipeline published on its own — not touched this round, flagged here instead

**Next up**

1. Run the pipeline on 2017-2022
2. Do the first real human review pass over `content/parked/`
3. Fill in the counts this round deliberately left blank, once the runs are done

## 2026-08-01

**Done**

- Drafted 11 problems in one batch (all of 2023, plus 2024 F-H): 11 drafted, 0 failed, ~2.5 hours of wall clock. Reviewed and published every one. **Playable 19 -> 30, sub-questions 294 -> 441 at 97% exact. 2023, 2024, 2025 and 2026 are all complete**
- Four figures cropped: the nine vloxes for 2023 C, three card sets for 2024 G
- Filled in per-problem author bylines for 2023 and 2024 F-H from each booklet's credits page
- `/practice` no longer lists catalogue entries. The 34 untranscribed problems are stated once at the foot of the page as "More problems coming soon" with a per-year tally

**Five real errors the drafts contained, none of which the schema could see**

Worth recording, because they are the shape of what review is actually for:

1. **2023 B** — the booklet marks stress by underlining the *vowel* of each syllable. The draft read the underlines as syllable *boundaries* and rewrote the data with hyphens, inventing divisions the source never states. It also dropped the ogoneks from `hąąhere` and `wanįǧįgra`, turning nasal vowels into plain ones. Rebuilt with `<u>` on the vowels, matching the print
2. **2023 D** — every `ɲ` (n with left hook, U+0272) came back as `ŋ` (eng, U+014B). A different consonant, 8 times
3. **2023 E** — two characters dropped out of the Hawaiian text (`oloheloheamalun` -> `olohelohealun`), which is the exact string the transitional-probability counts are computed over. Caught by diffing against the PDF text layer; the corrected text independently reproduces the official counts (12 k's, 1 followed by i, 7 by a)
4. **2023 F** — answer keys were bare letters (`"B"`) against choices like `"B. calabash"`, so a dropdown would have marked every correct answer wrong. Same bug class as 2025 B last session
5. **2024 H** — the tap `ɾ` was flattened to `r` throughout. The problem booklet prints `ɾ`; NACLO's own solution sheet prints `r`. Data now shows what the student reads, and both spellings grade as correct, since `ɾ` is on no keyboard they have

**Where things stand**

Batch drafting is reliable; per-glyph review is the thing that cannot be skipped. Three of the five errors above were caught by mechanically diffing the draft against the PDF text layer, which is cheap and should be the first step on every future batch. The two that needed eyes on the rendered page (2023 B's underlines, 2023 F's tone marks) were both cases where the *typography* carries meaning.

One font limit worth knowing: the shipped Charis SIL subsets do not carry U+1DC6 (combining macron-grave), which 2023 F's Nizaa data uses. Substituted `ḕ` (U+1E15), which keeps the tone contour and is covered. A plain macron would have dropped it.

**Colour, with a job for every hue**

Brief was "more colourful, like other learning platforms, but never vibecoded". The two pull against each other, so the resolution is that no hue is decorative: accent for action and brand, one hue per concept for subject, oxblood and verdigris unchanged for cost and correct. The warm paper ground stays, which is what keeps it from reading as a template.

The 21st.dev MCP catalogue was queried for direction and returned almost nothing but WebGL gradient shaders and pastel blends, and its theme catalogue is empty. Useful only as an anti-reference, which is worth knowing before reaching for it again.

Contrast was measured, not eyeballed. Chrome returns `oklch()` verbatim from `getComputedStyle`, so a naive parse reads the three numbers as RGB and reports every colour as near-black; the real figures came from painting each value to a canvas and reading the pixel. Accent 8.09:1 on paper, concepts 5.4-6.0:1.

Two hue collisions were caught and fixed: the first `writing systems` green sat almost on verdigris "correct", and `historical` brick on oxblood "error". The ring now skips both bands.

**Renamed to morpheme**

Wordmark set in a geometric sans, ink on paper. Gotham was asked for but is a licensed Hoefler & Co face that cannot be redistributed, so the shipped file is a 5KB Montserrat subset behind a `Wordmark` family; real Gotham is a one-line swap once licensed. The reference art reverses the mark out of charcoal, which is kept for the app icon rather than applied to the page: the site has no dark mode and inverting a page to suit a logo is backwards.

localStorage keys still say `gloss.` on purpose. They are internal and renaming them would wipe saved progress for no visible gain.

**Answering moved into the problem**

Reported from use: the answer box being below the problem, when the blank is inside it, reads as two separate blanks and is confusing on a first problem. Records now mark the spot (`<span class="blank" data-q="F1.a">`) and the input is rendered there, in the table cell or mid-sentence. 87 blanks across 10 problems; a part answered entirely in place lists nothing below.

The implementation detail worth remembering: portaling into nodes created by `dangerouslySetInnerHTML` silently breaks unless the body element is memoized. Without `useMemo`, the state update that stores the slot nodes triggers a re-render, React re-applies the innerHTML, and the captured nodes are replaced. The portals then render into detached spans, so the inputs exist in memory and nothing appears on the page. No error, no warning. Caught by checking `document.contains(el)`.

**Answering was not discoverable, reported from actual use**

A booklet prints its blanks as bare letters in a table cell (`a.`, `b.`, ...), followed by "Fill in the blanks a. to g." The answer boxes are in the Questions section, past the rest of the body and the timer, which on 2025 F is about a thousand pixels down. Nothing connected the two, so the reasonable read was that filling blanks is not supported. Added a line under the body pointing at Questions and saying the boxes carry the same letters.

Separately: 21 typed answers need a letter a US keyboard does not have (`þ`, `ŋ`, `ɨ`, `ɾ`). All 21 already accepted a plain-letter variant, so they were answerable, but only by accident of the student guessing. There is now a note in the questions header on exactly those problems, and `validate.ts` fails the build if any typed answer has no enterable spelling, so the note cannot become a lie.

**Carried over / needs fixing**

- 34 problems (2018, 2020-2022) still catalogue-only. 2019 has a page map but no records at all — it was never catalogued, so it does not appear in the coming-soon tally either
- Vercel project still named `naclo-thing`
- README still unwritten

## 2026-07-31 (later sessions)

**Done**

- Catalogued the whole 2018-2025 archive (`1da1ff5`): 64 records, of which 6 playable at the time. Added the `tier` field (`full` vs `catalogue`) so the archive is findable and filterable long before it is all transcribed
- Transcribed 2025 E and G (`156b865`); E needed Armenian, which surfaced the general problem below
- Attacked the throughput bottleneck (`9be9677`) three ways: a glyph-coverage gate in `validate.ts` that reads the allowed `unicode-range`s straight out of `globals.css`; 21 preloaded script font subsets; and `scripts/ingest/draft.ts`, the batch drafting pipeline the spec always called for but that had never been built
- Unlocked 2019 (`3fa47c2`). Both its booklets return a substitution cipher from `pdftotext`, but the cipher is consistent and the header furniture survives it, so scanning for `(X)` and `(n/m)` pins all eight problems to their pages without decoding a word of prose. Verified against the rendered page. Archive coverage 58 -> 66
- Drafted 10 problems in one batch run (2024 A, C, D, E and 2025 A, B, C, D, F, H): 10 drafted, 0 failed, ~112k input / ~148k output tokens, roughly $4 total, about 45 minutes unattended
- Reviewed and published 6 of them (`2a41643`): 2024 B, C, D and 2025 B, C, F. **Playable problems 8 -> 14, sub-questions 138 -> 232, 94% exact.** Every answer key was checked against the official solution pages rather than trusted from the draft
- Added the nasal-vowel font subset (`bddad7e`) for Tucano `kamrẽ` in 2025 C
- Cleared the drafts queue (`4f273de`, `f5a7fe6`, `07ca56b`): cropped the ten figures the last five problems needed, added a katakana subset for 2024 E, and published 2024 A, E and 2025 A, D, H. **Playable 14 -> 19, sub-questions 232 -> 294 at 95% exact. 2025 is complete at all eight problems**

**Where things stand**

The pipeline works end to end and the review step is now the only slow part, which is where the spec wants it. Drafting a problem costs about $0.40 and produces a record whose keys, in this batch, matched the official solutions cell for cell in all six cases checked. What the model does *not* get right without help is bounded and predictable: it invents its own question-id scheme, it reaches for arrows and ✔/✘ that no shipped font carries, and it cannot crop a figure. The first two are now prompt rules; the third is genuinely manual.

Two real bugs were caught by review rather than by validation, which is worth remembering when judging how far to trust a draft. 2025 B's B3 had `answerKey: "9"` against choices like `"9. to cross over"`, so every correct answer would have been marked wrong. And 2024 B graded a free English translation as `exact`, which would have failed a student who wrote "the dog lies on the horse" — it is now `llm`. Neither is visible to the schema.

Verified after the build that `llm` answer keys still do not reach the browser: the prerendered HTML for 2024 B carries exactly 8 `answerKey` fields for its 8 `exact` questions, and none for the `llm` one.

**Carried over / needs fixing**

- 45 archive problems (2018-2023 and 2024 F-H) are still catalogue-only. `npm run draft -- <year>` handles a year at a time; 2019's page map is in place, so nothing is blocked
- Figure crops are the one step the pipeline cannot do. Ten were cut by hand this session; budget for roughly one or two per problem drafted
- ~~`ANTHROPIC_API_KEY` not set in Vercel~~ **Resolved.** Verified live against production after this deploy: `POST /api/help` for 2025 C part C1 returned HTTP 200 with a real model-written hint that nudged toward the rule without naming an answer. AI help and `llm` grading work in production; the 503 noted earlier today is gone
- The Vercel project is still named `naclo-thing`, so the URL does not match `gloss.`
- `npm audit`: 12 high advisories, no fix available (3 nest under `next` itself)
- Still no visual verification by any agent — the site has only ever been checked by fetching HTML and reading the build output

**Next up**

1. Keep drafting year by year; 2023 was the originally chosen scope and is untouched, and 2024 F-H would finish that year
2. Rename the Vercel project so the URL matches `gloss.`
3. Get eyes (or a browser agent) on the published pages — still the oldest untouched gap

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
