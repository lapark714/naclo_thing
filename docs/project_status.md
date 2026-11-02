# Project Status

This file will hold the project's development status and thus document whatever large updates/accomplishments on the project have been made day-by-day. It is meant to help keep track of where things were left off from the previous day, as a personal reminder.

## 2026-11-02

**Done**

- Rebased the palette onto NACLO's official brand colours. The two hues were pinned from the source rather than eyeballed from a screenshot: `#ff9a04` is `color:` on every h1 in naclo.org's stylesheet and is the literal value of 3,634 pixels of `naclo_orange.PNG`, and `#00aaee` is declared eight times in the same file as the nav fill, the link colour and the rule under every heading. Both were read out of the live site's computed styles and its logo canvas, so the values are theirs and not an interpretation
- Orange replaces `oklch(0.7 0.19 45)` = `#fa6e1d` as `--action`: a yellower, lighter hue, `oklch(0.774 0.173 64.9)` against the old `oklch(0.7 0.19 45)`. Cyan replaces verdigris as the colour of a correct answer. `#44ccf4`, NACLO's own nav hover, became the dark column's cyan rather than a value invented for it
- The ground went to NACLO's flat `#ffffff` on `#000000`, and the dark column was de-warmed to neutral greys to match. Giving up the warm paper was the real cost of the change and it was taken deliberately — a palette that borrows a brand's two hues while quietly keeping its own paper stock is not that brand's palette, and two themes in different temperatures are two design systems
- Oxblood stays, which was the one thing worth asking about before touching anything. Spending orange on both "press this" and "you got this wrong" was the alternative, and red for a wrong answer has no brand substitute
- 21 contrast pairings re-solved against the new grounds with a written OKLCH/WCAG solver before any CSS changed, the same way the dark theme was built. The day column came out *better* than the warm one it replaced: `--ink-faint` 3.09:1 → 4.54:1 and `--rule-strong` 1.65:1 → 3.03:1, both of which had been sitting below their floors. The night column gained the same two fixes
- Verified in the browser rather than assumed: both themes resolve correctly from `getComputedStyle` (not from a screenshot, which lagged repaint and twice showed the wrong theme); a correct and an incorrect answer were actually typed and checked on 2026-A, giving `#0c7eb1`/`#5cd2f7` for "Correct" and `#a4342a`/`#e16758` for "Not yet"; and an inline answer on 2023-A confirmed the vivid `#00aaee` renders as the underline on a correct blank. Mobile at 375px checked too. Lint, build (75 pages) and `npm run validate` all clean

**Decisions worth remembering**

- **Two tokens, not one, per brand hue.** Neither NACLO colour can set text on white — orange is 2.13:1 there, cyan 2.63:1 — so each keeps a deepened twin for body size. The vivid value fills, outlines and underlines; the deep value writes. This is the arrangement `--action`/`--action-deep` already had, extended to cyan rather than invented for it. naclo.org does set links in `#00aaee` directly, which is a genuine accessibility failure on their page, and fidelity is not a reason to copy it
- **The Lifted Surface Rule survived by changing instrument.** It said a raised thing sits one tonal step above the ground, and the day ground became `#ffffff`, above which nothing sits. So by day `--surface` *is* the ground and lift moved to the border and shadow already drawn around every table, input, popover and chip. Night is untouched. What the rule always meant was "this reads as above the page", and on a white page a rule says that and a fill cannot — the fill only ever encoded it by accident of the ground being paper
- **The old "no blue accent" anti-reference had to be retired carefully.** DESIGN.md rejected the generic SaaS dashboard and named "a blue accent" as part of it. NACLO's brand carries a cyan, so that clause now reads as a ban on the brand. It was rewritten rather than deleted: what the rejection always meant is a hue chosen because products have one, not a hue a competition actually uses
- **Found a long-standing documentation error while checking it.** `--action` was recorded in three places as clearing "5.03:1 on paper". The real figure for `#fa6e1d` on `#fbfaf7` is 2.75:1; 6.93:1 belonged to `--action-deep` and the two had been conflated. Worth knowing because the new orange is 2.13:1 on white and that looked like a regression against a number that was never true. Both are accepted for the same reason: a filled control is identified by its 9.88:1 black label, so WCAG 1.4.11 does not ask the boundary to carry it, and the wordmark is exempt under 1.4.3
- The reading-progress hairline and the mastery bars stayed ink on purpose. Both carry written reasoning that position and progress are neither action nor correctness, and a row of orange bars on the library page would read as decoration. A palette swap is not a licence to reassign roles

**Later the same day**

- Brought over NACLO's section-heading pattern, an amber heading over a 1px cyan rule, on the three display headings. Their orange cannot be copied exactly here: #ff9a04 is 2.13:1 on white, under the 3:1 floor large text gets, and a heading is prose so it has no logo exemption. Day uses the same hue at 3.31:1, night uses the brand value at 8.66:1 because the dark ground allows it. `--action-head` is kept out of `@theme` on purpose, so there is no utility to misapply it at body size
- A 27-agent audit of the morning's rebase found four real contrast regressions, all one mistake: ratios solved against `--paper` rather than against the darkest ground a token actually lands on. Three tokens had been tuned to exactly 4.5:1 on the page and so failed on a hovered row, which composites `--tint` at 60%. Re-solved on `--tint`, which is now a written rule
- It also caught `text-on-action/60` on a selected chip at 4.38:1 — opacity composites the label into the fill, so the opacity is part of the ratio, which I had not checked anywhere. And five stale comments, including a DESIGN.md don't-list that still banned "no blue accent" as "the one confirmed rejection" while the Overview three screens above retired that clause. My own grep missed it because the phrase wraps across two lines

**Decisions worth remembering, part two**

- **Solve a colour against the worst ground it can land on, not against the page.** This is the lesson of the whole day. Every ratio I checked in the morning was correct and every one was measured against the wrong thing. A hover tint, a lifted surface and an opacity modifier are all grounds
- **Grep is not an audit.** Two of the misses were invisible to `grep -n "blue"` and `grep verdigris` because the stale phrase wrapped a line break. Reading the file beats matching a pattern in it

**Second audit, same day**

- Ran the audit again over the heading work and the re-solve. It found that I had written the Worst Ground Rule and then not applied it to `--rule-strong` — the one token in the palette with a non-text 3:1 floor rather than a 4.5:1 text one, and the one I did not check. It was 2.48:1 on a night table header while DESIGN.md certified it as clearing 1.4.11
- That one matters more than its severity suggests. On three controls the 1px rule is the *only* thing marking them and the same colour sits on both sides of it, so nothing rescues the boundary: the free-text inline blank (`border-0 border-b`, no fill, inside a `--surface` table scroller), the help popover's unfilled buttons inside a `--surface` panel, and the timer's `--surface` input inside a `--surface` panel. Re-solved with headroom this time rather than to the floor
- It also caught that the rule's own wording was backwards at night. "Solve against the darkest ground" is right by day and wrong by night, where the grounds run #141414 < #1f1f1f < #262626 and the worst is the lightest. Someone following it literally would solve the night value against the easiest ground

**Decisions worth remembering, part three**

- **The rule you just wrote is the one you forget to apply.** Both audits found the same shape of error: a principle stated correctly and then applied to the obvious cases only. The first pass measured against `--paper` everywhere; the second fixed the three text tokens and skipped the one with a different floor, because a 3:1 token did not look like the thing the 4.5:1 rule was about
- **State a rule in terms of the property, not the appearance.** "Darkest ground" encoded a day-column assumption into a rule meant for both themes. "Least contrast" is the actual property and is theme-independent

**Left off / known**

- `--good-hover` and the three `*-tint` washes are defined and still unused by any component, as they were before this change
- The app icon keeps its reversed black-on-white lockup. Putting the wordmark on NACLO orange instead is a one-line change and a brand decision, not a palette one, so it was left alone
- The site is still unofficial and unendorsed. Using NACLO's colours is not a claim to their authority, and nothing in the copy suggests otherwise

## 2026-08-21

**Done**

- Built dark mode as a second theme rather than an inversion of the first. The direction is the same reference grammar read under a lamp at night: warm charcoal ground (`#191712`), warm off-white ink (`#eae7e0`), never pure black and never pure white, because the warmth is most of what stops the light theme looking like a template. The app icon already reverses the wordmark out of charcoal, so the dark lockup was the brand's own, not an invention
- Every colour is declared once, as `light-dark(day, night)`, switched by the CSS `color-scheme` property rather than a `.dark` class. Two consequences worth keeping: the whole theme works with no JavaScript at all, and `color-scheme` also tells the browser to repaint scrollbars, form controls and the overscroll gutter — the thing a class-based theme has to remember separately and usually doesn't. Manual override is two CSS rules plus a ~200-byte blocking script in `<head>`
- Night ratios were solved against the night ground, not mirrored off the day column. Equal WCAG contrast reads as *less* separation near black, so hairlines, tonal blocks and the lifted surface each take a wider step at night than a flip would give them. Body text is held at 14.5:1 rather than the day column's 17.0:1 on purpose — light text on a dark ground blooms, and the last two points buy glare rather than legibility over a twenty-minute problem. 21 pairings solved and verified before any CSS was written
- Two tokens had to be invented, and both were places where the old system was literal rather than semantic. `--surface` replaces `#ffffff` in fourteen components: the White Means Above rule meant "one step lifted off the ground", and white only encoded that by accident of the ground being paper. `--on-action` replaces `text-ink` on the orange fill: that was correct only while `--ink` was guaranteed dark. Everything else — `bg-ink text-paper` on the primary button, selected chips, the open Hint trigger — kept working with only its values swapped, and not one of those components was touched
- Toggle is two cells in the existing filter-chip vocabulary, on the row that already holds the back link, so no navigation chrome was invented for it. Which cell is filled is decided in CSS, not React, so it is right on the first frame of a statically generated page; JavaScript only supplies `aria-pressed`
- Recaptured the three landing-page screenshots in **both** themes, each pair from the same scroll position with the clock frozen at 13:56, so only the theme differs. They swap by CSS rather than `<picture>`, because `<picture>` can only read the machine's setting and would keep serving the light shot to a reader who chose dark by hand
- Verified rather than assumed, in this order: `light-dark()` survives Tailwind v4's `color-mix()` opacity modifiers (`bg-tint/50` computes clean — had it not, the single-source palette would have had to become two duplicated blocks); light mode is byte-identical after the token swap (`bg-surface` → `rgb(255,255,255)`, `text-on-action` → `rgb(22,24,29)`, popover shadow unchanged); the theme script sits in `<head>`, after the stylesheet link, before `<body>`, with no `defer`/`async`, so no flash is possible; no sideways scroll at 390px. Lint, build (75 pages), `npm run validate`, and 120/120 tests all clean

- Made light the default for every reader, after the fact. Dark mode shipped following the operating system, which meant a student on a school machine set to dark met their first problem at night without choosing to. `:root` now declares `color-scheme: light`, the `<head>` script stamps nothing on a first visit, and `lib/theme.ts` lost `systemTheme()` and its `matchMedia` listener — the change removed code rather than adding a preference. Verified with the browser emulating a dark machine: fresh visit resolves light with the LIGHT cell filled and the light screenshots showing, the toggle still writes dark, and dark survives a reload

**Decisions worth remembering**

- **The operating system does not pick the theme; the product does.** Following `prefers-color-scheme` is the reflex, and it is wrong for this audience — the reader is 12–17, often on a machine they do not administer, often meeting the site inside a lesson. Day is the column the interface was drawn against and the one the screenshots and figure mats assume. Dark stays one click away and is remembered forever after
- **Never `filter: invert()` a problem figure.** It is the standard dark-mode move for diagrams and it is a content bug here. 2016 G asks which monk wears the white robe and which the black; inverting it does not dim the figure, it changes the answer. Photographs, engravings and line art all sit in `content/assets/` with nothing marking them apart, so no filter is safe across the set. Figures keep their true tone on a light mat with a rule around it, which frames the brightness as deliberate — the plate metaphor, made literal
- `--action` does not move between themes. It is the brand, it clears 5.03:1 on paper and 6.24:1 on charcoal, and moving it would make the wordmark two different oranges. Its derived values do move, in opposite directions
- Oxblood cannot stay oxblood at night. At 5.4:1 on a dark ground it has to lift to `#e16758`, which reads terracotta. That is a real loss to the palette and a physical constraint of dark mode, not a slip

**Left off / known**

- `--ink-faint` fails WCAG AA in both themes — 3.56:1 on the night ground and 3.08:1 on a night surface, against 3.09:1 and 3.23:1 by day, on the same nine strings. Confirmed by walking the live DOM in both themes and computing every text node against its effective background, so it is pre-existing and not a dark-mode regression. Left alone rather than changing the light theme unasked, but some affected strings are real instructions rather than metadata ("Each number goes with the circle it touches...", "Hints never give the answer. Explaining is free."), so lifting the token in both themes is a decision worth making rather than inheriting
- Problem figures are still the brightest thing on a dark page. That is the honest answer for facsimiles whose tonal values are the data, but it has not been seen by a student on a real screen at night
- `.impeccable/design.json` is stale against `DESIGN.md` and wants `/impeccable document` to refresh it. Not run, since the skill says drift is reported, not repaired as a side effect

## 2026-08-19

**Done**

- Swapped the site's type system: Poppins for display, Verdana for text. Every heading role is now Poppins 600 (self-hosted, latin + latin-ext, 13.5KB); body, labels, captions and table headers are Verdana, which is a system face and downloads nothing. The wordmark is untouched. Noto Serif Display was the old display face, had no remaining consumer, and was deleted along with its files
- Language data stayed on Charis SIL, deliberately. Verdana has no IPA, no Latin Extended-B and no non-Latin script, and `validate.ts` only checks the `unicode-range`s declared in `globals.css`, not which stack an element actually names — so pointing `.data` at Verdana would have passed the build clean and rendered Cherokee, N'Ko and IPA in whatever the browser found. The Noto script stack sits behind Verdana in `--ui-stack` for the same reason: a hint can quote the language it is about
- Verified the swap by computed style rather than by eye: wordmark → Wordmark, headings → Poppins, body/labels → Verdana, table data → Charis SIL. Glyph coverage diffed before and after (nothing lost, gained U+2191/U+2193 from Poppins), `npm run validate` output identical to baseline, lint and build clean

**Left off / known**

- The prose measure runs long and predates this change. `max-width: 68ch` renders as 81 characters under the old Noto Sans and 84 under Verdana, because `ch` is the width of "0" and Verdana's figures are wide relative to its lowercase. Not touched, since it was already out of band and narrowing the column is a visible design decision. `57ch` would put it at ~70 characters if that is wanted

## 2026-08-03

**Done**

- Built a consensus ingest pipeline that replaces human review as the publish gate. `manifest.ts` pins page spans, official points, and author bylines straight off each booklet's own text layer, so the model never owns a fact machine-readable text already states. `draft.ts` drafts every problem twice — pass A at 150dpi, reading tables strictly cell by cell; pass B at 300dpi, reading each page holistically first — because two passes that fail differently give the rest of the pipeline something to check. `diff.ts` compares the two drafts on fact only (keys, grading modes, points, choices, figure counts), skipping hints, explanations, and invented answer variants, since those are prose a model will always word two different ways. `witness.ts` checks language data against the booklet's own text layer, which can't repeat a misreading the way a second model pass can. `arbitrate.ts` spends one model call per disagreement, given the page image and the extracted text, and answers UNRESOLVED rather than guess when the evidence isn't clear. `figures.ts` crops automatically with a confirm-and-retry loop, up to three attempts. `fonts.ts` fetches a Noto subset from the Google Fonts CSS API for any script the corpus introduces. `publish.ts` publishes only a record with zero flags and parks everything else in `content/parked/` with its reasons attached. `run.ts` orchestrates all seven stages per year and writes a dated report to `docs/ingest-runs/`
- 2019 is never auto-published, by policy, no matter what its two passes agree on. Its booklets return a substitution cipher, so there is no witness check to catch a correlated misread, and two passes agreeing with each other is not evidence when neither had anything independent to be wrong against. It is still drafted and diffed, so what a human eventually reviews is a short check against real candidate answers rather than a transcription from scratch
- Ran the pipeline for real across the whole 2016-2022 target span (58 problems). The first full run published 6 and parked 45, with 7 failing outright — 16 of 116 drafts had failed silently. Reading that output (not review) surfaced real bugs in the pipeline itself; after fixing them and doing a gap-filling redraft, the final run published 12 and parked 46. The library now stands at **41 playable, 598 sub-questions (573 exact, 25 llm, 0 self, 96% exact), 68 records, 55 languages** — up from 30 playable / 441 sub-questions / 64 records before this branch. Playable by year: 2016: 2, 2017: 2, 2018: 2, 2020: 1, 2021: 2, 2022: 2, 2023: 8, 2024: 8, 2025: 8, 2026: 6. 2019 contributed nothing: all eight parked by policy, since its booklets return a substitution cipher from `pdftotext` that neither the witness check nor arbitration can run against. Approximate spend across all drafting and ingest runs so far: roughly $60. Run reports live in `docs/ingest-runs/`
- Reconciled the site's copy and the project docs with what the pipeline actually does, now that publishing no longer waits on a person. `app/page.tsx`'s guarantee under the call to action no longer promises a human check before anything ships; it now says what is actually true — two independent transcriptions, compared against each other and against the text inside the original PDF, and any answer flaggable as wrong. An earlier draft of that sentence claimed the problems were cross-checked against NACLO's official solutions, which the final whole-branch review caught as an over-claim: the solution pages are an input to drafting, never a check, and arbitration is only ever shown the problem pages. `CLAUDE.md`'s content-integrity rules and architecture tree, `PRODUCT.md`'s process description and one stale "current behaviour" bullet, and `docs/architecture.md`'s whole ingest data-flow diagram were rewritten to match. `CLAUDE.md`'s tree had also drifted on its own, independent of this change: missing components (`coming-soon.tsx`, `home-demo.tsx`, `inline-answer.tsx`, `use-answer.ts`) and `content/parked/`, and a `scripts/ingest/` listing that still named the four original files instead of the pipeline's real modules

**Bugs the runs surfaced, each found by reading real output, not by review**

1. `acceptedVariants` was in `diff.ts`'s comparison — a list of alternate spellings the model invents, not a booklet fact, so two passes always propose different lists. On the eight 2016 problems it was every flag on two of them, most of the flags on a third. Dropped (`b6d55fc`)
2. Per-question `points` was in the comparison too — derived arithmetic, so two passes that counted a different number of questions always disagreed on it. 40% of all flags on the first run, and it never changed a publish decision; the booklet's total is pinned from the header regardless. Dropped (`1049447`)
3. Question ids were compared case-insensitively (`e8951fe`), which wasn't enough: a prompt rule mandating positional ids was added and one pass ignored it anyway, naming the same twenty-one questions `E1.1` against the other's `E1.a` — eighty spurious flags. Ids are now paired by position when counts match; a differing count emits one flag instead of a cascade (`4c524bb`)
4. The witness check's language-data comparison was also being diffed between the two passes directly; `data:count` differences (which span got wrapped in `class="data"` markup, not what the booklet actually says) were the largest single cause of near-clean problems parking. Witness now checks pass A's language spans against the PDF text layer alone; table cells still get compared, since alignment is often the puzzle (`09e59ee`)
5. Arbitration cap lowered from 25 flags to 5 — the first run put sixteen flags through arbitration and every one came back UNRESOLVED, which is the prompt behaving as designed, not a reason to keep paying per flag (`4a2244f`)
6. The hint-leak check was flagging hints for using words they need — "vowels" in a phonology hint, the numbers themselves in a perfect-squares hint. Purely numeric keys and ordinary English content words are now skipped; distinctive foreign-language keys still flag, and those were the real leaks (`ebbf6e8`)

**Findings from the final whole-branch review — one Critical, six Important, all fixed**

- A rejected figure crop was being cached as confirmed: the crop moved to its final asset path before the vision confirm ran, so a crop rejected three times still sat there, the `existsSync` cache check skipped it silently on any re-run, and a record the pipeline had refused to publish would publish with a clipped figure — unsolvable, for a problem where the figure is the puzzle (`2ba26d1`)
- The publish gate only checked the Zod schema; `validate.ts` enforces nine further rules the build depends on. A record shipped with HTML markup inside two hint texts, passed publish, then failed the build for all forty-two published records at once — the pipeline reported success and the site refused to ship (`05f296b`)
- Also fixed: a stale counterpart record left live after a re-park, and `_reviewNotes` shipping into published records (`3a2ba34`); `draft.ts` still telling the operator to hand-copy drafts into `content/problems/`, bypassing every gate (`2048373`); arbitration able to write an answer key matching neither transcription (`ec5ac9a`); an unguarded orchestrator tail that could lose the run report (`aab3562`)
- One regression the fixes themselves caused, worth recording honestly: deleting a record's stale counterpart also deleted 27 catalogue stubs sharing its id prefix, shrinking the archive from 64 records to 41 before it was caught and fixed so only a stale `tier: "full"` record is removed (`3a2f15d`)

**Where things stand**

The pipeline has now run for real across its whole target span (2016-2022) and settled at 41 playable / 598 sub-questions / 68 records / 55 languages, with 47 problems parked and 27 catalogue stubs remaining. `PRODUCT.md`'s Capabilities and Evidence sections already reflect these numbers in the working tree (uncommitted as of this writing) — the "hold off updating them" note from earlier today is resolved. Every park that remains looked legitimate on inspection once the false-positive sources above were fixed: park is the default failure mode on purpose, since an unresolved disagreement reaching a student is the expensive mistake and a parked problem waiting for a person is the cheap one. The pipeline is unit-tested stage by stage (`tests/ingest/*.test.ts`). This pipeline does not touch or re-run the archive's already-published, human-reviewed 2023-2026 span.

Most of this session's content output — the re-run 2016 records, all of 2017-2022's published and parked records, and the new crops in `content/assets/` — is sitting uncommitted in the working tree, per the repo convention of keeping content commits separate from code. It has not been committed yet.

**Carried over / needs fixing**

- 47 parked problems await human review. Each carries a `_parkReasons` array naming exactly what stopped it, so review is resolving named questions rather than transcribing from scratch
- 2019's eight problems will not auto-publish under any circumstances (by policy — no witness check is possible) and need a human regardless of what the two drafting passes agree on
- Three problems in the pre-existing published archive have hints that name their own graded answer, found by the new hint-leak check running against old content: `2023-open-A` ("git"), `2026-open-A` ("tuesday"), `2026-open-D` ("hildïlh"). These predate the pipeline and were missed by human review
- 2007-2015 remains undecided. The pipeline handles it with nine more lines in the `EXAMS` table plus page maps; whether it's worth the spend is now a question the run reports can answer
- `CLAUDE.md`'s content-integrity bullet on written hints/explanations still says they are "human-reviewed," which is no longer guaranteed for a record the consensus pipeline published on its own — not touched this round, flagged here instead
- This session's content changes (58 problems' worth of published/parked records, new crops, `PRODUCT.md`) are uncommitted — need a content commit (or several, per the one-record-type-per-commit convention) before any of this is durable

**Next up**

1. Commit this session's content output
2. Do the first real human review pass over `content/parked/` (47 problems)
3. Fix the three pre-existing hints that leak their own answer
4. Decide on a plan for 2019 (needs a human, no auto-publish path) and for 2007-2015 (undecided, not yet attempted)

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
