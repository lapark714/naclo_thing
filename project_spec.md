# NACLO Prep Platform — Project Spec

> Companion to `brainstorm.md`, which holds the original idea. This document is the design.

---

## 1. Problem & Motivation

NACLO (North American Computational Linguistics Olympiad) publishes past exams and practice
problems as PDFs, along with solution PDFs for most of them. As a preparation resource this has
three gaps:

- **No targeting.** A student who wants to drill morphology problems has to open twenty PDFs and
  guess from the titles.
- **No scaffolding.** When you get stuck, the only options are to stare harder or read the full
  answer. There is no middle step.
- **Keys state answers, not reasoning.** The official solutions tell you *what* the answer is.
  They rarely walk you through how a solver would have found it — which is the only part that
  transfers to the next problem.

**Goal:** a standalone website where the existing NACLO problem set becomes an interactive prep
experience — searchable by concept, scaffolded with hints, explained step by step, and practiceable
under whatever time pressure the student chooses.

**Non-goal at launch:** writing new problems. The existing NACLO back catalogue is the entire
question bank.

---

## 2. Product Overview

| Feature | Description |
|---|---|
| **Concept-targeted practice** | Student picks a concept ("morphology", "writing systems", "number systems") and gets matching problems |
| **Tiered hints** | Three escalating levels of help per problem; each one taken reduces XP earned |
| **Step-by-step explanations** | Full worked reasoning after the attempt, not just the answer |
| **XP & progression** | XP per problem solved, reduced by hints taken; progress tracked per concept |
| **Flexible timing** | Untimed, user-set per-question limits, or full exams under official time (§9) |
| **Full past exams** | Complete past papers under real contest conditions |

**Later (not specced here):** native app, leaderboards, AI-generated original problems.

---

## 3. Core Architecture — Offline Ingestion, Not Runtime AI

This is the defining decision of the project.

The AI does not read PDFs while a student is on the page. PDFs are processed **once, offline**,
into a reviewed database of structured problem records. The website then serves plain rows.

```
NACLO problem PDF + solution PDF
        │
        ▼
  extraction & transcription            ← offline, one-time (§4)
        │
        ▼
  LLM drafts: concept tags, hint ladder,
  step-by-step explanation, grading mode
        │
        ▼
  human review                          ← the quality gate
        │
        ▼
  problem database
        │
        ▼
  website serves reviewed rows          ← no LLM on page load
```

**Why it has to work this way:**

- **Deterministic.** Every student sees the same hint and the same explanation. Runtime generation
  produces something slightly different each time, so the XP deduction for "took hint 2" is not
  reproducible and two students comparing notes see two different products.
- **Reviewable.** A wrong explanation gets caught once, by a human, before it ships. With runtime
  generation you can never review what students actually see — it doesn't exist until they load it.
- **Bounded cost.** Annotation is a one-time expense. Runtime generation is a bill that scales with
  every page view, forever, on a free educational site.
- **Fast.** No generation latency between clicking a problem and reading it.

Runtime AI is confined to exactly one optional job: grading free-text answers (§5).

---

## 4. The Extraction Problem

**This is the project's real cost — budget for it honestly.**

NACLO problem PDFs are not ordinary documents. A typical set contains:

- IPA transcription and heavy diacritics
- Non-Latin scripts (Devanagari, Georgian, Cherokee syllabary, Amharic, …)
- Glyph specimens that exist only as images (Mayan, Ogham, cuneiform, invented orthographies)
- **Alignment-critical data tables**, where the row/column correspondence *is* the puzzle
- Occasional diagrams: kinship trees, phonological charts, maps

Naive text extraction (`pdftotext` and friends) mangles all of this. A Rosetta-stone table whose
alignment has been destroyed is not a degraded problem — it is an unsolvable one.

**Approach — hybrid, decided per problem at ingest:**

| Content | Handling |
|---|---|
| Prose | Transcribe to Unicode HTML |
| Data tables | Real HTML tables, transcribed and verified cell by cell |
| Glyph specimens, diagrams | Crop from the PDF, store as images with alt text |

Everything UTF-8. Font stack must actually cover what's used — Noto family for scripts, Charis SIL
or Gentium for IPA. A missing-glyph box in the middle of a phonology problem is a broken problem.

The cell-by-cell table verification is where the human review hours go. Plan accordingly.

---

## 5. Grading Design

**Explaining an answer and grading an answer are different jobs.** The solution PDFs solve the
first one completely. They do not solve the second: when a student types into a box, something
still has to return correct / incorrect so XP can be awarded.

The good news is that ground truth exists, so grading is **comparison against a known key**, not
open-ended judgment. The design question is which comparison mechanism each question needs.

**Every sub-question is assigned a grading mode at ingest time and stores it in the record.**
No runtime guessing.

| Mode | Used for | Mechanism |
|---|---|---|
| `exact` | Single tokens, table cells, matching, ordering | Normalized string comparison — case / diacritic / whitespace folding, plus an explicit accepted-variants list |
| `llm` | Short free response ("translate these sentences") | Model compares student text against the official key; returns correct / partial / incorrect with a reason |
| `self` | Open-ended ("state the rule", "explain why") | Reveal key and rubric; student self-marks. XP awarded but flagged as self-reported |

**Design rules:**

- **Bias hard toward `exact`.** It is free, instant, offline, and reproducible. Many NACLO
  sub-questions are table completion or one-word translation and qualify directly.
- **Mode is per sub-question, not per problem.** A single NACLO problem routinely mixes a
  fill-the-table part (auto-gradable) with a "state the rule" part (not). Tagging at the problem
  level would force the worst case onto the whole thing and lose auto-grading everywhere.
- **Mirror NACLO's own point breakdowns** for partial credit rather than inventing a scheme. The
  official keys usually carry them.
- **`llm` mode needs a dispute button.** Mis-grading corrodes trust in XP faster than any other
  failure. Let the student flag it; review flagged items and grow the accepted-variants list.

---

## 6. Hints — Pre-Authored Ladders

Three tiers per problem, written once during ingest and human-reviewed:

| Tier | Purpose | Example shape |
|---|---|---|
| 1 | **Orientation** — where to look | "Compare rows 2 and 5. What changes between them?" |
| 2 | **Method** — the key insight, unapplied | "The suffix is marking number, not case." |
| 3 | **Partial work** — one step done for you | Work through the first form, leave the rest |

XP cost escalates by tier.

**Do not generate hints at runtime from the solution key.** Two failure modes: a model handed the
full answer routinely gives away too much, and the hint differs every time, which makes the XP
penalty non-reproducible. Pre-authoring fixes both and costs nothing at runtime.

---

## 7. Concept Taxonomy

The headline feature — "enter the concept you want to study" — requires every problem to be tagged.
NACLO publishes no such tags, so the taxonomy has to be built. Tags are LLM-drafted at ingest and
human-reviewed. Problems get **multiple** tags, not one category.

**Axes:**

- **Linguistic domain** — phonology, morphology, syntax, semantics, orthography / writing systems,
  historical & comparative, sociolinguistics, number systems
- **Problem form** — Rosetta-stone translation, table completion, rule discovery, transliteration,
  calendrical / counting, formal & computational (parsing, edit distance, encoding, finite-state)
- **Difficulty** — derived from round (Open vs. Invitational) as a starting proxy
- **Language / region** — secondary, but useful for variety so a session doesn't serve three
  Austronesian problems in a row

---

## 8. Problem Data Model

One record per problem. **Exam membership is metadata, not structure** — this is what lets a single
store serve both concept drills and full timed exams without duplicating content.

```
Problem
  id, year, round (open | invitational), letter, title, author(s)
  source_pdf_url, solution_pdf_url        # link back to NACLO originals

  concept_tags[], form_tag, difficulty, languages[]
  official_points
  official_time_minutes                   # exam-mode budget + basis for suggested timer

  body_html                               # transcribed statement + data tables
  assets[]                                # cropped images + alt text

  questions[]
      id, prompt_html, grading_mode, answer_key,
      accepted_variants[], points

  hints[]                                 # tier 1–3, text, xp_cost
  explanation_html                        # step-by-step walkthrough

  review_status (drafted | reviewed | published)
```

`review_status` is load-bearing: it is the mechanism that keeps unreviewed AI output away from
students. Only `published` records are ever served.

---

## 9. Timing & Practice Modes

Three modes over the same problem store.

### 9.1 Untimed — the practice default

No clock. This is the right default when learning an unfamiliar problem type; a timer on your first
ever Rosetta-stone problem measures nothing useful.

### 9.2 Custom per-question timer

The student sets their own limit on any practice question.

- **Suggested default is pre-filled**, derived from `official_time_minutes` scaled to that
  question's share of the problem — so the field is never blank — but the student can override it
  to anything.
- **Global default in settings** ("always give me 10 minutes"), so it doesn't have to be re-entered
  on every question.
- **Soft expiry.** When time runs out, show a banner and *keep the input live*. The purpose is
  self-pacing awareness, not punishment — cutting a learner off mid-thought interrupts exactly the
  moment they're closest to the insight.
- **Timer survives refresh.** Persist the start timestamp, not an elapsed-second counter — counters
  drift when the tab is backgrounded and reset on reload.
- **Does not affect XP by default.** A "beat the clock" bonus is noted as a possible later addition
  but deliberately not specced: tying XP to speed rewards guessing, which is the opposite of the
  skill NACLO tests.

### 9.3 Full exam mode

An entire past exam under its official total time, scored against official points. **Hard stop** at
expiry — this is the one place a hard cutoff is correct, because the point is simulating real
contest conditions.

---

## 10. XP & Progression

XP per problem solved, reduced by hints taken, as originally conceived — with one adjustment.

XP-and-streak mechanics are borrowed from daily-habit products like Duolingo, where the streak *is*
the product. NACLO runs once a year (Open Round in late January), so real usage will be a spike
lasting a few weeks, not a year-round habit. Accordingly:

- **Keep** per-problem XP and the hint penalty — they make help available without making it free,
  which is the good idea in the original design.
- **Drop** streaks. They punish exactly the usage pattern this audience actually has.
- **Lead the UI with concept mastery** — "Morphology: 6 / 14" — over cumulative XP. A student
  cramming in January wants to know what they haven't covered yet, not their lifetime point total.

---

## 11. Attribution & Content Handling

NACLO problems credit individual authors. Carry that byline onto every problem page, and link back
to the original problem and solution PDFs from each one. Costs nothing and is simply correct.

---

## 12. Phase 1 Scope

**Anti-goal: do not ingest twenty years of problems before shipping anything.**

Ship one vertical slice: **a single full past exam (~8 problems), annotated end to end** — tagged,
hint-laddered, explained, grading modes assigned — with concept practice, hints, explanations, and
all three timing modes working over just those.

Why this shape:

- It exercises every part of the pipeline, so unknown-unknowns surface at 8 problems instead of 300.
- It produces an honest per-problem annotation time estimate, which is the number that determines
  whether the full back catalogue is a month of work or a year.
- It is a real, demoable product rather than a prototype.

Scale to the full catalogue only after that slice feels good to use.

---

## 13. Open Questions

- **Grading split.** What fraction of NACLO sub-questions are genuinely `exact`? Sample one full
  exam and count before committing to an architecture. If it's 80%, runtime AI is nearly optional;
  if it's 20%, the cost model changes.
- **Self-graded XP.** Does it count the same as verified XP, or display distinctly?
- **Mobile.** Many students will practice on a phone, and alignment-critical tables are hostile to
  narrow screens. Test this early — it may constrain how tables are transcribed.
- **Alt text when the glyph *is* the puzzle.** Describing a Mayan numeral accessibly without giving
  away the answer is genuinely tricky.
- **Accounts.** NACLO reaches middle schoolers, so a meaningful share of users will be under 13,
  which brings real constraints on collecting personal data. Simplest path: no account required,
  progress in `localStorage`. Optional sign-in — and the future leaderboard, which is the
  data-hungriest feature on the roadmap — stays a later decision rather than a launch dependency.
- **Solution PDFs.** Serve NACLO's originals alongside the new explanations, or supersede them?
