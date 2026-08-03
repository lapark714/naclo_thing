# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, both arriving alone and without an account.

**Students preparing for NACLO**, roughly 12 to 17, often looking at their first
linguistics problem. They usually study at a computer. Many have never seen a
gloss, an IPA symbol, or a non-Latin script laid out as data, and they do not
yet know that "getting stuck" is the normal middle of a problem rather than a
verdict on them.

**Casual puzzlers** who enjoy a linguistics problem and will never sit the
contest. Confirmed in the init interview. This audience limits how much the
site can lean on contest framing: someone who does not know what NACLO is, and
does not care, still has to find the site usable and worth their time.

No coach, teacher, or classroom audience is in scope. Nobody assigns work here,
and nothing is shared between people.

## Product Purpose

NACLO publishes its past Open Round exams as PDFs. Everything a student needs is
technically available, and almost none of it is usable: the archive cannot be
searched, one kind of problem cannot be picked out, and a stuck solver's only
option is to read the full solution and lose the problem.

morpheme turns that archive into something you can work in. Problems are
transcribed to real HTML with real tables, tagged by concept, and fitted with a
graduated hint ladder, a worked explanation, and grading that happens as you go.

Success is a student getting further into a problem than they would have alone,
and losing fewer problems to the all-or-nothing jump from stuck to solution.

## Positioning

The middle step between staring at a problem and reading the answer.

Two things a neighbouring product could not truthfully copy without doing the
same work:

- **Graduated, priced help.** Three hints per problem unlock in order, each with
  its XP cost shown before it is spent. The first says where to look; the last
  works a step through on data that is not graded. Request-time AI help sits on
  top of the reviewed ladder and is prompted against revealing answers.
- **Reasoning, not keys.** NACLO's own solution sheets give the answer and
  rarely the route. Every playable problem here carries a written walkthrough of
  how a solver gets there.

## Operating Context

- Students study at a computer, so the site is designed desktop-first, but it
  must hold up on a phone. A wide data table scrolls inside its own container
  and never pushes the page sideways.
- The source material is the NACLO Open Round booklets, 2018 to 2026, published
  as PDFs at naclo.org. Problem PDFs are copyrighted and stay out of the
  repository.
- Problem data is the interface. Alignment in a table is often the puzzle
  itself, and the languages involved use scripts a default font stack does not
  cover. A missing glyph does not make a problem ugly, it makes it unsolvable.
- Content is authored offline. Each problem is transcribed twice by a model,
  the two passes are cross-checked against each other and against the
  booklet's own text layer, and anything the checks cannot settle is parked
  for a person rather than published.

## Capabilities and Constraints

**Today:** 64 problem records covering 2018 to 2026. 30 are fully playable with
441 sub-questions, and 2023 through 2026 are complete. The other 34 are
catalogue entries: transcribed metadata, not yet a problem anyone can work. They
are counted at the foot of the practice page as "more coming soon" rather than
listed, because a row a student cannot open is not a problem, and mixing the two
made the library look larger than it is.

- **Grading** is decided per sub-question at ingest: `exact` runs in the browser
  with forgiving normalization, `llm` calls a server route for free-text
  translation, `self` is unused. Currently 427 exact, 14 llm, 0 self.
- **Help** is a three-tier written hint ladder with XP costs, plus a
  request-time route offering an extra AI hint, a plain-language explanation,
  and an answer reveal that zeroes that part's XP.
- **Timing** is opt-in. Untimed by default; when a timer expires a banner
  appears and every input stays live.
- **Progress** lives in the browser's local storage and is expressed as coverage
  per concept rather than a lifetime score.
- **Architecture** is a statically generated site over JSON content files in
  git, with no database. The only request-time server work is grading and AI
  help. A validation script blocks the build on schema errors, missing figures,
  empty or unmatched answer keys, characters no self-hosted font covers, and
  markup in fields the site renders as plain text.

**Hard constraint, confirmed:** no accounts and no personal data, ever. Progress
stays in the student's browser. Some users are under 13, and nothing collected
is nothing to leak.

**Current behaviour, not confirmed as permanent.** These hold today and are
enforced in code and in CLAUDE.md, but the init interview did not commit them as
inviolable, so future work may revisit them deliberately rather than assuming
either way: help always costing XP and hints never giving the answer; every
problem carrying its author byline and a link to the original PDF; only
records the pipeline's cross-checks could vouch for reaching a student, with
human review moved to a follow-on pass over what gets parked instead of
sitting on the publish path.

**Explicitly undecided:** what morpheme becomes beyond the current MVP. Whole-paper
timed exam mode, cross-device progress, and staying a pure practice library are
all open. Records already carry `year`, `round`, `officialPoints`, and
`officialTimeMinutes`, so assembling whole papers later needs no schema change,
but nothing should be built toward that direction until it is chosen.

## Brand Commitments

- The product is **morpheme**, lower case, no full stop. The wordmark is set
  in a geometric sans (Gotham where licensed, Montserrat as the shipped
  stand-in), split at its own morpheme boundary: `morph` in ink, `eme` in the
  accent. The reference art reverses it out of charcoal; that lockup is kept
  for the app icon, not for the page.
- Colour answers to a job or it is not used. Three roles: a warm action colour
  for action and brand, oxblood for cost and error, verdigris for correct. No
  gradients, no tinted cards, no coloured surfaces, and no colour-coded
  categories.
- Copy is written for a 12 to 17 year old on their first problem: plain,
  encouraging, brief. No linguistics jargon without a plain-English gloss.
- US spelling.
- No em dashes in any user-facing copy.
- Errors say what to do next, and an AI grading verdict can always be flagged as
  wrong.
- No dark mode in the MVP.

## Evidence on Hand

- 64 reviewed problem records in `content/problems/`, with answer keys checked
  against NACLO's official solution pages.
- Cropped figures in `content/assets/`, and self-hosted font subsets in
  `public/fonts/` covering Latin, IPA, Armenian, Devanagari, Georgian, Cherokee,
  Ethiopic, N'Ko, Greek, Cyrillic, katakana, and nasal-vowel blocks.
- Author bylines and links to the original booklets on every problem page.
- Live at naclo-prep.vercel.app; naclo-thing.vercel.app redirects to it. The
  URL still does not match the product name.

There are no users yet, no testimonials, no usage numbers, no press, and no
endorsement from NACLO. The site is unofficial. Future work must not invent any
of these.

## Product Principles

1. **Help is available but never free.** A student can always get unstuck. The
   cost is shown before it is spent, so asking is a decision rather than a
   reflex.
2. **Never cut a student off.** Timers are a pacing tool. Expiry produces a
   banner, never a locked screen, because interrupting someone mid-thought is
   the worst possible moment.
3. **Show reasoning, not just answers.** The walkthrough is the thing this site
   adds over the PDF. Anything that reduces a problem to its key is a step
   backwards.
4. **The problem is the interface.** Data tables, glyphs, and alignment come
   first. Chrome, decoration, and cleverness yield to legibility.
5. **Coverage, not score.** Progress reads as "morphology 6 of 31", not a
   lifetime point total, so returning after a break is not a loss.

## Accessibility & Inclusion

No formal conformance target has been set. Two product-specific requirements are
established and enforced:

- Every character in every problem must be covered by a self-hosted font. The
  build fails otherwise. For a problem about a writing system, an unrendered
  glyph removes the puzzle.
- The page body never scrolls sideways. Wide tables scroll inside their own
  container so that prose stays reachable on a phone.

Deciding an explicit standard, and whether screen-reader support for the data
tables is a goal, is open.
