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
- **Answering in place.** A record can mark where its booklet prints a blank with `<span class="blank" data-q="F1.a"></span>`, and the site renders that question's input there: inside the table cell, or inside the sentence for a cloze like `Ne grette ge _____`. 87 blanks across 10 problems. A part answered entirely in place lists no rows below, so the same blank is never shown twice. `components/inline-answer.tsx` and `components/use-answer.ts` (the grading logic both surfaces share, so they cannot diverge)
- Each blank carries its printed label (`data-label`), shown beside its box. Booklet instructions refer to those labels ("fill in a. to g."), so without them on screen a student cannot tell which blank is which. Two printed forms across the archive, `(a)` and `a.`, recorded per problem rather than normalized
- The Hint for a part answered in place sits with those blanks, anchored after the last block of that part's own section rather than at the foot of the page
- A line between the problem body and the timer pointing at whatever is still answered below
- A note in the questions header, shown only when some answer needs a letter a US keyboard lacks, saying the plain spelling counts and accents can be dropped. This was already true of all 21 such questions and nothing said so
- Answer-slot gate in `scripts/ingest/validate.ts`: a slot naming no question would render a blank nobody can fill, and a question with two slots would give it two boxes whose state disagrees. Both are invisible in the browser
- Typeable-answer gate in `scripts/ingest/validate.ts`: an `exact` typed answer whose key and every accepted variant need a non-ASCII letter fails the build. Grading forgives accents but not distinct letters, so a key of `þu` with no `thu` variant is unanswerable however well it is solved
- **A consensus ingest pipeline, replacing human review as the publish gate.** `scripts/ingest/manifest.ts` (`bdfb674`) pins page spans, official points, and author bylines straight off each booklet's `pdftotext` output, so the model never owns a fact machine-readable text already states — covers every target year (2016-2022) except 2019, whose booklets are mojibake and fall back to model values for these fields alone. `draft.ts` now drafts every problem twice (`3b86222`): pass A at 150dpi, reading every table cell by cell; pass B at 300dpi, reading each page holistically first. Two passes that fail differently is the point — a misreading only one of them makes is what the rest of the pipeline exists to catch
- `scripts/ingest/diff.ts` (`ad04809`, `26b7d30`, `b6d55fc`, `1049447`): compares the two drafts on fact only — answer keys, grading modes, points, choices, figure counts. Hints, explanations, and invented `acceptedVariants` are excluded on purpose, since two passes will always word prose differently; per-question `points` was dropped from the comparison too, since it's derived arithmetic rather than a booklet fact and dominated the flag count on the first real run without ever changing a publish decision
- `scripts/ingest/witness.ts` (`a893eb2`): checks the two passes' language data against the booklet's own text layer, which can't repeat a misreading the way a second model pass can — this is the check that would have caught three of the five transcription errors found by hand in the 2023 review batch. Skipped for 2019, whose booklets return a substitution cipher instead of readable text
- `scripts/ingest/arbitrate.ts` (`548a560`, `b1afe6e`): one model call per disagreement, given the page image and the extracted text, that either picks a value or answers UNRESOLVED — defaulting to UNRESOLVED is correct, since an unresolved flag only parks the problem, while a confidently wrong pick reaches a student. Never run for 2019, which has no independent evidence to arbitrate with, and 2019 is never auto-published at all regardless of what its two passes agree on (`7781e8a`): agreement between two model passes can't catch a correlated misread, and the witness check that would is exactly what 2019 lacks
- `scripts/ingest/figures.ts` (`ceb01b3`, `687ab56`, `65f83be`, `f0bcfdf`): crops figures automatically instead of by hand. The model gives a coarse percentage box, a confirm pass checks whether the cut is complete or clipped, and the box widens and retries up to three times before the problem parks
- `scripts/ingest/fonts.ts` (`020d8c8`, `72bc167`): fetches a Noto subset from the Google Fonts CSS API for any script the corpus introduces that the shipped fonts don't already cover
- `scripts/ingest/publish.ts` (`072c459`, `e8b6da2`): decides, writes, and reports. A record publishes only when it has zero flags and parses clean; everything else writes to `content/parked/<id>.json` with a `_parkReasons` array. `content/parked/` is committed on purpose — it's the queue for later human passes and is meant to be read in a diff; `lib/content.ts` reads neither it nor `content/drafts/`
- `scripts/ingest/run.ts` (`2456934`, `e8951fe`): orchestrates all seven stages for one or more years, four problems at a time, resuming from existing drafts so an interrupted run doesn't pay twice. `npm run ingest -- <year...> | --all | --dry`. Question ids now compare case-insensitively across passes, and a problem past 25 disagreements skips straight to parked rather than paying for per-field arbitration that can't rescue a mismatched question count
- `docs/ingest-runs/*.md`: a dated report written by every run, naming every parked problem and the reasons it parked
- `tests/ingest/*.test.ts`: unit coverage for manifest, diff, witness, arbitrate, figures, fonts, pool, and publish
- Ran the pipeline for real for the first time, on 2016 Open Round (`9640c3d`): [COUNT NEEDED — published vs. parked for this run, and for each subsequent year as it runs]

### Changed

- **Human review moved off the publish path.** A record now publishes when the consensus pipeline's checks clear, not when a person signs off; review is a follow-on pass over `content/parked/` and over answers a student flags as wrong. The site's own claim about this changed to match: `app/page.tsx`'s guarantee under the CTA no longer says a person checks every problem before it ships, and now says what actually happens — two independent transcriptions, cross-checked against NACLO's official solutions, with any answer flaggable as wrong. `CLAUDE.md`'s content-integrity rules, `PRODUCT.md`'s process description, and `docs/architecture.md`'s ingest data flow were all reconciled to the same reality
- `CLAUDE.md`'s architecture tree also had drifted independently of the pipeline work: it was missing several components (`coming-soon.tsx`, `home-demo.tsx`, `inline-answer.tsx`, `use-answer.ts`) and `content/parked/`, and its `scripts/ingest/` listing still named the four original files rather than the pipeline's real modules

- Dropped the difficulty filter from `/practice`. Concept is the axis that answers "what do I want to work on"; difficulty was a second axis nobody asked for, and it narrowed a 30-problem library to slices of five
- Retired the concept colour ring. Eight coded dots across a library page read as decoration rather than wayfinding, which is the opposite of what colour is for here. Concepts are named in words and the words were always doing the work. `lib/concept-color.ts` and the `--c-*` tokens are gone
- Action colour is warm now (`oklch(0.46 0.12 62)`, a burnt amber) rather than the cool blue-violet that reads as a generated default. 7.02:1 on paper, and it runs darker and far less red than oxblood, which it never shares a role with: one fills a button, the other is small text beside a wrong answer


- Home page leads with a real problem. `components/home-demo.tsx` puts three verbatim rows of 2023 D (Permyak, Pavel Iosad) and its question (b) on the landing page, graded by the same `checkExact` the site uses, so a visitor solves a genuine NACLO blank before committing to anything. Writes no progress: a demonstration should not mark a problem nobody opened
- Primary action moved above the explainer. Measured on a 390px viewport: the CTA was at 896px against an 844px fold and is now at 744px, fully visible without scrolling
- Opening copy leads with the puzzle rather than the contest, since PRODUCT.md commits to an audience that has never heard of NACLO. The "drafted with AI, checked by a person" line moved out of the second sentence to sit under the CTA as a guarantee rather than a process disclosure


- **A colour system with four roles.** `--accent` (deep azure, `oklch(0.42 0.115 250)`) for action and brand: the primary button, a selected control, the `-eme` of the wordmark. A ring of eight hues, one per concept tag, for subject: dots beside the tag name in the practice list, the coverage list and the problem header, and the fill of a selected filter chip. Oxblood and verdigris keep cost/error and correct. Nothing else is chromatic, and there are no gradients, tinted cards, or coloured surfaces
- The concept ring skips the hues oxblood (~27) and verdigris (~158) occupy and runs a step lower in chroma, so a subject marker cannot be read as a verdict. Measured, not eyeballed: accent 8.09:1 on paper, every concept 5.4-6.0:1, all above the 4.5:1 AA floor as both a dot and a chip fill
- Taxonomy gate in `scripts/ingest/validate.ts`: concept and form tags must come from `content/taxonomy.ts`. 2025 D had duplicated its form tag into its concept list, which now renders as a grey dot among coloured ones


- No suggested or allowed time anywhere. The timer starts empty, Start stays disabled until a number is entered, and the only figure offered is the one the student saved themselves. A booklet's budget is a contest constraint, not advice to someone practising at their own pace, and printing it turns a limit the student chose into one they are measured against. `officialTimeMinutes` stays in the schema as booklet metadata; it is simply never shown
- The pointer to the questions below appears only on a problem answered in both places. Where every question is below, the list is not "the rest" of anything and there is nothing above it to mistake for the answer area


- Renamed the product from `gloss.` to **morpheme**, set in a geometric sans wordmark. The brief asked for Gotham, which is licensed from Hoefler & Co and cannot be redistributed, so what ships is a 5KB subset of Montserrat wired behind a `Wordmark` family: swapping in real Gotham is one `src:` line. Ink on paper on the page, since the page is paper; the reference art's charcoal lockup is kept for `app/icon.svg`, which replaces the default Next.js favicon
- The `gloss.progress.v1` and `gloss.timer.*` localStorage keys are deliberately unchanged. They are internal, never shown, and renaming them would silently wipe every saved answer and timer


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
