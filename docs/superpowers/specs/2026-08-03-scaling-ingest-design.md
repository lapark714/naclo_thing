# Scaling the ingest pipeline — design

**Date:** 2026-08-03
**Goal:** take the library from 30 playable problems to 88 in one unattended run,
without dozens of manual sessions.

## Scope

Open Rounds 2016–2026. 58 problems to draft; 30 are already published.

| Year | Count | State today | Text layer |
|---|---|---|---|
| 2016 | 8 (A–H) | no records | clean, both booklets |
| 2017 | 8 (A–H) | no records | clean, both booklets |
| 2018 | 8 | catalogue | clean |
| 2019 | 8 | no records | **mojibake**, hand page map exists |
| 2020 | 8 | catalogue | clean |
| 2021 | 9 | catalogue | clean |
| 2022 | 9 | catalogue | clean |
| 2023–2026 | 30 | published | — |

2007–2015 is deliberately out of scope. Adding it later is ~9 lines in the
`EXAMS` table plus page maps; the pipeline is unchanged. Defer the decision until
the first run reports how much parked and how the older text layers held up.

## Review policy — changed

Human review is no longer on the publish path. A record publishes when the
pipeline's automated gates all pass; anything else parks for a human.

This is a deliberate departure from `CLAUDE.md`'s "unreviewed AI drafts never
reach a student" and from `PRODUCT.md`'s "publishing is a human act." Both, and
the home-page guarantee, are updated as part of this work (see Copy below).
Human review still happens — it moves from a gate to a follow-on pass over an
already-live library, driven by the parked queue and by student flags.

No new schema field records provenance. `reviewStatus: "published"` remains the
only gate. Git history distinguishes the 30 human-reviewed records if that is
ever wanted; adding a `verifiedBy` field now would be speculative.

## Architecture

Two tiers. Fields the booklet states in machine-readable form are extracted
deterministically and pinned; the model owns only what needs a page read as a
human would do it.

```
0  MANIFEST      deterministic — pages, title, officialPoints, authors
1  DRAFT x2      two decorrelated model passes
2  DIFF          deterministic — compare the factual layer only
3  WITNESS       deterministic — check language data against pdftotext
4  ARBITRATE     model — flagged fields only
5  FIGURES       auto-crop, then confirm
6  FONTS         auto-extend subsets for uncovered scripts
7  PUBLISH/PARK  all green publishes; anything else parks
```

Stages 0, 2, 3, 6 and 7 make no model calls. Stages 4 and 5 fire only on
problems that need them.

**Pass A is the base record.** Stages 2 and 3 both run against it and each emit
flags — stage 2 where pass B disagrees, stage 3 where the text layer does. Stage
4 resolves all flags into the base record. Pass B exists to disagree, not to be
merged.

### Stage 0 — Manifest

Extends the existing `buildManifest()`. Per problem, extracted from the booklet
text layer:

- page spans for problem and solution (already working)
- `title` from the header (already working)
- `officialPoints` from `[N points]` in the header — new
- `authors` from the credits block, `Problem A: Name, Name and Name` — new

All four are **pinned** onto the record after the model returns, the way
`id`/`year`/`round`/`letter` already are. A pinned field cannot be wrong and
needs no consensus check, which is why moving fields here is worth more than
verifying them better.

All 42 existing catalogue records carry `authors: []`, so this backfills them
too.

### Stage 1 — Two decorrelated drafts

The same problem is drafted twice, into `content/drafts/<id>.a.json` and
`<id>.b.json`:

| | Pass A | Pass B |
|---|---|---|
| Render | 150 dpi | 300 dpi |
| Prompt | cell-by-cell, row-major | holistic |

Decorrelation matters because the recorded failure modes (`ɲ` read as `ŋ`, `ɾ`
flattened to `r`) are the kind of error one model makes twice on the same image.
Different resolution and different reading order attack that; the text layer in
stage 3 attacks it harder.

Runs through a promise pool capped at 4. Sequentially, 116 calls is most of a
day; at 4 concurrent it is roughly 1–1.5 hours unattended.

Hints and explanations are generated in pass A only. They are creative prose,
two passes will never agree, and diffing them produces noise. They are checked
for constraints instead: exactly three tiers, no answer revealed, no character
outside the covered set.

### Stage 2 — Mechanical diff

Compares only the factual layer of A against B:

- per question: `id`, `gradingMode`, `answerKey`, `acceptedVariants`, `points`, `choices`
- table structure from `bodyHtml`: row and column counts, and cell text
- every `class="data"` span and every `<dt>`/`<dd>` pair

Ignores `hints`, `explanationHtml`, `partPrompt` phrasing and prose paragraphs.

Every mismatch becomes a flag naming the field and both candidate values.

### Stage 3 — Text-layer witness

Every language-data token in the base record must appear in the `pdftotext`
output of the page it came from, compared after Unicode NFC normalization and
whitespace collapse. Tokens that do not appear are flagged.

This is the strongest gate in the pipeline: unlike a second model pass it is a
genuinely independent witness that cannot hallucinate a glyph. It caught three
of the five errors in the 2023 batch.

Skipped for 2019, whose booklets return a substitution cipher.

### Stage 4 — Arbitration

For each flag from stages 2 and 3, one model call receives both candidate
values, a crop of the relevant page region, and the corresponding text-layer
excerpt, and returns the correct value or `unresolved`. Cheap, because it runs
per flag rather than per problem.

**2019 is excluded.** With no text-layer witness, arbitration would re-read the
same images that produced the disagreement. Its two passes must agree outright
or the problem parks.

### Stage 5 — Figures

The prompt already has the model describe croppable regions in `_reviewNotes`.
This stage acts on them: crop generously with `pdftoppm -x -y -W -H`, then a
vision pass confirms the crop is `complete`, `cut-off`, or `contains-stray-text`
and adjusts. Up to two retries, then the problem parks.

Coarse regions plus a confirm loop is deliberately preferred over asking for
precise bounding boxes, which vision models estimate poorly.

### Stage 6 — Font coverage

`validate.ts` already computes characters no shipped subset covers. This stage
acts on the result: group uncovered codepoints by Unicode block, map the block
to the Noto family that covers it, fetch the woff2 slices and `unicode-range`
declarations from the Google Fonts CSS API, write them into `public/fonts/` and
`app/globals.css`.

No local subsetting and no new system dependency: `fonttools` is not installed,
and the 42 existing woff2 files came from this same API. Anything unmappable is
reported, and its problem parks.

### Stage 7 — Publish or park

Publishes to `content/problems/<id>.json` with `reviewStatus: "published"` when
every gate is green: no unresolved flags, all figures cropped and confirmed, all
characters covered, and `validate.ts` clean.

Otherwise writes `content/parked/<id>.json` with a `_parkReasons` array. Parked
is the default failure mode, so a problem the pipeline cannot vouch for reaches
the queue rather than a student.

## File layout

`content/drafts/` stays gitignored — transient two-pass scratch.
`content/parked/` is new and **committed**: it is the review queue for later
human passes, and gets the diffable-JSON-in-git benefit the repo already relies
on. `lib/content.ts` reads neither.

New and changed under `scripts/ingest/`, one purpose each:

| File | Purpose |
|---|---|
| `manifest.ts` | new — stage 0, extracted from `draft.ts` |
| `draft.ts` | changed — two passes, concurrency, pinned fields |
| `reconcile.ts` | new — stages 2, 3, 4 |
| `figures.ts` | new — stage 5 |
| `fonts.ts` | new — stage 6 |
| `publish.ts` | new — stage 7 and the run report |
| `run.ts` | new — orchestrates 0–7 |

Each module exports a function and carries a thin CLI, so a stage can be rerun
alone while `npm run ingest` runs the lot.

## Run report

`docs/ingest-runs/YYYY-MM-DD.md`, committed. Per problem: published or parked,
which gates fired, what each flag was, and cost. Aggregates: counts, total
spend, and the list of parked ids with reasons.

This is what the 2007–2015 decision gets made on.

## Copy and docs to update

The "checked by a person" claim becomes false for 58 of 88 problems and is
replaced with a cross-checking claim the pipeline earns:

- `app/page.tsx` — the guarantee under the CTA
- `CLAUDE.md` — content-integrity rules
- `PRODUCT.md` — "publishing is a human act", and the capabilities counts
- `docs/architecture.md` — the ingest data flow, `content/parked/`
- `docs/changelog.md` and `docs/project_status.md` — per repo etiquette

Copy must hold to the brand rules already in `PRODUCT.md`: US spelling, no em
dashes in user-facing text.

## Cost and outcome

58 problems at roughly $1.20 each (two drafts at the measured ~$0.40, plus
arbitration on flags and a figure pass): **~$70**, band $58–93.

Result: 88 playable problems, all eight concept tags well covered, from one
unattended run plus a session on whatever parked.

## Risks

| Risk | Handling |
|---|---|
| Correlated model error survives both passes | Text-layer witness is independent; 2019 lacks it and parks on any disagreement |
| 2019 parks entirely | Bounded at 8 problems and visible in the report; acceptable |
| Figure auto-crop is unreliable | Confirm loop with two retries, then park |
| A script has no Noto coverage | Reported, problem parks, handled by hand |
| Run interrupted mid-way | Existing skip-if-exists behaviour makes reruns resumable |
| Rate limits at concurrency 4 | Existing `RateLimitError` backoff, retried rather than failed |

## Out of scope

- 2007–2015, Invitational Rounds, and the practice sets
- Any per-problem provenance UI
- A `fetch.ts` script; booklets are downloaded by hand
- General page-map inference; per-year quirks are hardcoded in a table
