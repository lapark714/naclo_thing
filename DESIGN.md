---
name: morpheme
description: A reference grammar you can type into. Past NACLO linguistics problems, set for study.
colors:
  paper: "#fbfaf7"
  ink: "#16181d"
  ink-soft: "#5a6070"
  ink-faint: "#8b8f9c"
  rule: "#dfdcd4"
  rule-strong: "#c9c5ba"
  tint: "#f1eee6"
  oxblood: "#a4342a"
  oxblood-tint: "#f8efed"
  verdigris: "#2f6b4f"
  verdigris-tint: "#ebf2ee"
  surface: "#ffffff"
  accent: "oklch(0.42 0.115 250)"
  accent-hover: "oklch(0.33 0.1 250)"
  accent-tint: "oklch(0.96 0.018 250)"
  c-historical: "oklch(0.5 0.09 72)"
  c-sociolinguistics: "oklch(0.5 0.09 110)"
  c-number-systems: "oklch(0.5 0.09 142)"
  c-writing-systems: "oklch(0.5 0.09 190)"
  c-morphology: "oklch(0.5 0.09 220)"
  c-syntax: "oklch(0.5 0.09 255)"
  c-semantics: "oklch(0.5 0.09 295)"
  c-phonology: "oklch(0.5 0.09 335)"
typography:
  wordmark:
    fontFamily: '"Wordmark", "Helvetica Neue", Arial, sans-serif'
    fontSize: "3.5rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
  display:
    fontFamily: '"Noto Serif Display", Georgia, serif'
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "normal"
  headline:
    fontFamily: '"Noto Serif Display", Georgia, serif'
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: '"Noto Serif Display", Georgia, serif'
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: '"Noto Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  data:
    fontFamily: '"Charis SIL", "Noto Sans Armenian", "Noto Sans Devanagari", "Noto Sans Georgian", "Noto Sans Cherokee", "Noto Sans Ethiopic", "Noto Sans NKo", "Noto Sans JP", "Noto Sans", "Doulos SIL", Charter, Georgia, serif'
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '"Noto Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.14em"
rounded:
  none: "0px"
spacing:
  gutter: "20px"
  gutter-wide: "32px"
  block: "40px"
  section: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "16px 32px"
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "6px 12px"
    typography: "{typography.label}"
  button-secondary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "4px 10px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  input-answer:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "6px 8px"
    typography: "{typography.data}"
  table-header:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink-soft}"
    padding: "8px 14px"
    typography: "{typography.label}"
---

# Design System: morpheme

## Overview

**Creative North Star: "The Reference Grammar"**

The page is a scholarly linguistics volume that happens to accept typing. Warm
paper stock, a serif display face used sparingly at the top of a page, and data
set with the care a good grammar gives its example sentences. The subject is a
Warlpiri locative suffix or an Armenian transliteration, and the design's job is
to present that subject accurately and then get out of the way.

Density is closer to a printed page than to an application. Rules are hairlines,
corners are square, and the only fill in the palette is the near-black used to
mark a control as active. Colour is nearly absent: a page of eight problems is
paper, ink, and one line of oxblood where something costs XP. That restraint is
what makes the data legible, and the data is the whole product.

The single confirmed rejection is the generic SaaS dashboard: soft shadows, a
blue accent, rounded cards, and sidebar chrome. Nothing here should look like a
product template. Beyond that, no other visual anti-reference has been agreed,
so treat category habit as unresolved rather than forbidden.

**Key Characteristics:**

- Warm paper ground (#fbfaf7), never pure white except on raised surfaces
- Square corners everywhere; the radius scale exists in tokens and is unused
- Hairline rules and tonal blocks carry structure instead of shadows
- Serif display for identity, humanist sans for interface, a dedicated
  linguistics face for language data
- One accent, spent on cost and error, not on decoration

## Colors

A paper-and-ink neutral field with two signal colours held in reserve.

### Primary

- **Ink** (#16181d): Body text, headings, and the fill that marks a control
  active. A selected filter chip, the primary button, and an open Hint button
  are all ink-on-paper reversed. It is the closest thing to a brand colour and
  it is a near-black.

### Secondary

- **Oxblood** (#a4342a): The single accent. It appears on XP costs, on a wrong
  answer, and on a flagged verdict. Deep and muted rather than alarming, because
  a student seeing it is mid-problem, not in danger.
- **Oxblood Tint** (#f8efed): The wash behind an incorrect answer row.

### Tertiary

- **Verdigris** (#2f6b4f): Correctness only. A muted green that reads as
  confirmation rather than celebration.
- **Verdigris Tint** (#ebf2ee): The wash behind a correct answer row.

### Neutral

- **Paper** (#fbfaf7): The page ground. Warm, slightly off-white, so long
  reading does not glare.
- **Surface** (#ffffff): Pure white, reserved for things that sit above the
  page: data tables, inputs, the hint popover, unselected chips. White is a
  layer signal, not a background.
- **Ink Soft** (#5a6070): Secondary prose, table headers, captions.
- **Ink Faint** (#8b8f9c): Metadata that should recede: counts, footnotes,
  disabled states.
- **Rule** (#dfdcd4): Hairline dividers and table borders.
- **Rule Strong** (#c9c5ba): Input and control borders, one step darker than
  Rule so a control reads as interactive against a mere divider.
- **Tint** (#f1eee6): Tonal block for table headers and hover states, the
  substitute for elevation.

### Named Rules

**The Every Colour Has A Job Rule.** Four colour roles exist and nothing else
is chromatic. Oxblood means cost or error. Verdigris means correct. Accent
means action or brand: the primary button, a selected control, a link, the
`-eme` of the wordmark. The concept ring means subject, one hue per tag in
`content/taxonomy.ts`. If something needs to stand out and is none of those, it
stands out through weight, rule, or ink fill. Decoration is not a role, and
there are no gradients, tinted cards, or coloured surfaces anywhere.

This replaces an earlier One Accent Rule that allowed only oxblood and
verdigris. The brief asked for the colour of a learning platform; the
discipline that keeps it from reading as a template is that every hue still
answers to a job.

**The Colour Is Never Alone Rule.** A concept's colour always sits beside that
concept's name, so the code is redundant and learnable rather than something to
memorise. The ring skips the hues oxblood and verdigris occupy, and runs a step
lower in chroma than either, so a subject marker can never be mistaken for a
verdict.

**The White Means Above Rule.** The page is paper; white is a raised surface.
Anything painted #ffffff is claiming to sit above the page, so use it only for
tables, inputs, popovers, and unselected controls.

## Typography

**Wordmark Font:** Wordmark, a geometric sans used for the logotype and nothing
else. The brief specifies Gotham, which is licensed and cannot be redistributed,
so what ships is a 5KB subset of Montserrat, the usual stand-in for Gotham in a
lowercase logotype. Swapping in real Gotham is one `src:` line in `globals.css`.

**Display Font:** Noto Serif Display (with Georgia, serif)
**Body Font:** Noto Sans (with ui-sans-serif, system-ui)
**Data Font:** Charis SIL, backed by a stack of Noto script faces and
Doulos SIL

**Character:** A high-contrast serif for identity against a plain humanist sans
for everything operational, with a third voice reserved entirely for language
data. Charis SIL is a linguistics face: it carries IPA, and its stack extends
into Armenian, Devanagari, Georgian, Cherokee, Ethiopic, N'Ko and katakana. That
third voice is the point of the pairing. A Warlpiri word and the sentence
describing it should not look like the same kind of thing.

Only one display cut ships (600). Headings do not declare a weight, so the
browser matches to that cut; do not introduce a second display weight without
adding the file.

### Hierarchy

- **Wordmark** (700, 3.5rem, -0.02em): The logotype, and only the logotype. Ink
  on paper, because the page is paper. The reference art reverses it out of
  charcoal; that lockup is kept for the app icon, never for the page.
- **Display** (600, 3rem, 1): Reserved. The landing page's opening is now the
  wordmark, so nothing currently uses this step.
- **Headline** (600, 2.25rem, 1.25): Problem titles.
- **Title** (600, 1.05rem, 1.4): Card and section headings inside a page.
- **Body** (400, 1rem, 1.5): Prose. Measure is capped between 54ch and 68ch
  depending on context, never full container width.
- **Data** (400, 0.95rem, 1.5): Every span of language data, table cell, and
  answer input.
- **Label** (600, 0.72rem, 0.14em tracking, uppercase): Section eyebrows,
  table headers, and all button text.

### Named Rules

**The Third Voice Rule.** Language data is set in the data stack, never the UI
sans, so a student can tell at a glance what is the language and what is the
site talking about it. This is the established convention rather than a hard
invariant; the enforced part is narrower and absolute: every character in a
published record must be covered by a self-hosted font, and the build fails
otherwise. A problem about a writing system with an unrendered glyph is not
degraded, it is unsolvable.

**The Uppercase Label Rule.** Anything functional and small is uppercase at
0.72rem with wide tracking: eyebrows, table headers, buttons. Sentence case is
for prose. This is what keeps controls legible at a size that would otherwise
be mistaken for body text.

## Layout

A single centred column, 48rem (768px) maximum, with 20px gutters that widen to
32px above the small breakpoint. Vertical rhythm runs on a coarse scale: 40px
between blocks, 64px between major sections, 64px to 96px of page padding on the
landing page.

The column is deliberately narrower than the data it sometimes holds. Wide
tables are not squeezed to fit; they keep their natural width inside a scrolling
container and overflow horizontally within it.

Responsive behaviour is almost entirely one breakpoint (640px). Above it,
gutters widen, the display type steps up, and the three how-it-works items sit
in a row. Below it, everything stacks. There is no separate mobile layout and no
navigation to collapse.

### Named Rules

**The Sideways Scroll Rule.** The page body never scrolls horizontally. A wide
table scrolls inside `.table-scroll` and nothing else moves. Every page wrapper
is a flex item of a column-flex body, so each one carries `width: 100%` and
`min-width: 0`; without both, a flex item refuses to shrink below its content
and drags the prose off-screen with the table.

**The Measure Rule.** Prose is capped by character count, not by container.
54ch for introductory copy, 58ch for instructions beside a problem, 68ch for
body text inside a problem. The container may be 768px; the sentence is not.

## Elevation & Depth

Flat by default. Depth comes from hairline rules and tonal blocks, not from
shadows. A table header is distinguished by a tint fill, a section by a 1px
rule, a raised surface by turning white against warm paper. There is no
elevation scale and no card shadow.

Exactly one shadow exists in the entire system, and it is earned. Controls do
not carry shadow at all: a button signals pressability by inverting its fill,
not by faking a raised edge.

### Shadow Vocabulary

- **Popover lift** (`box-shadow: 0 8px 28px -12px rgba(22,24,29,0.35)`): The
  hint panel only. It genuinely floats over the page and must read as
  detached from the problem underneath.
### Named Rules

**The Flat Page Rule.** Surfaces are flat at rest. The only shadow in the system
belongs to the one element that actually leaves the page, the hint popover.
Nothing else carries shadow, including controls. A hard zero-blur offset is a
neobrutalist costume and this world is not that.

## Shapes

Square. Every corner in the shipped interface computes to `0px`: buttons,
inputs, chips, tables, the popover.

The token file defines `--radius-sm: 2px`, `--radius-md: 3px`, and
`--radius-lg: 4px`, inherited from the shadcn scaffold. Nothing uses them.
Treat them as vestigial rather than as an available scale, and do not reach for
them to soften a component.

Form language is drawn rather than filled: 1px borders in Rule or Rule Strong
define most objects, and the ink fill is reserved for the active state. The
result is closer to ruled paper than to a card layout.

### Named Rules

**The Square Corner Rule.** Radius is zero everywhere. If a component looks
harsh, fix it with spacing, border colour, or tone, never with a radius.

## Components

### Buttons

- **Shape:** Square (0px radius), 1px border.
- **Primary:** Ink fill, paper text, 1px ink border, 16px by 32px padding,
  uppercase label at 0.85rem with 0.12em tracking. No shadow. One per page at
  most; it is the page's single call to action. On hover it inverts to paper
  fill with ink text against the border it already carries, so nothing shifts.
- **Secondary:** White fill, ink text, 1px ink border, 6px by 12px padding,
  uppercase label at 0.75rem. Used for Check, Show explanation, and every
  in-page action.
- **Hover / Focus:** Secondary buttons invert to ink fill with paper text on
  hover. Focus is the global 2px ink outline at 2px offset, never a coloured
  glow. Disabled drops to 35% opacity with `cursor: not-allowed`.

### Chips

- **Style:** Square, 1px border, 4px by 10px padding, 0.82rem. Unselected is
  white with a Rule Strong border and a Tint hover. Selected is ink fill with
  paper text and an ink border.
- **State:** Used for concept and difficulty filters, which stack. Each chip
  carries a tabular-nums count that dims to Ink Faint when unselected and to
  60% paper when selected.

### Cards / Containers

- **Corner Style:** Square.
- **Background:** Paper for the page, white for anything raised.
- **Shadow Strategy:** None. See Elevation.
- **Border:** 1px Rule for containers and dividers.
- **Internal Padding:** 20px for boxed sections, 16px inside the popover.

### Inputs

- **Style:** Square, 1px Rule Strong border, white fill, 6px by 8px padding,
  set in the data font because the student is typing language data.
- **Focus:** Global 2px ink outline, 2px offset. No border-colour shift.
- **Verdict:** Correct rows wash Verdigris Tint, incorrect wash Oxblood Tint.
  The verdict line sits beneath in 0.82rem, coloured Verdigris or Oxblood.
- **Disabled:** 70% opacity, used once an answer is locked.

### Data Table

The signature component. Real `<table>` markup inside a `.table-scroll`
container with `overflow-x: auto`, a 1px Rule border and a white fill.

- Header cells: Tint fill, Ink Soft text, uppercase label type at 0.72rem with
  0.06em tracking, 8px by 14px padding.
- Body cells: data type at 0.95rem, 7px by 14px padding, `white-space: nowrap`,
  divided by 1px Rule bottoms.
- Cells never wrap. Alignment between columns is frequently the puzzle itself,
  so the table keeps its natural width and scrolls rather than reflowing.

### Hint Popover

The other signature component, anchored to each part of a problem rather than to
the page.

- Trigger: a small square button labelled **Hint**, 1px Rule Strong border,
  white fill, uppercase 0.72rem, Ink Soft text. It inverts to ink fill while
  open and appends the XP spent on that part in Oxblood.
- Panel: white, 1px ink border, 16px padding, `min(23rem, calc(100vw - 2.5rem))`
  wide, carrying the popover lift shadow. It holds the three-tier written hint
  ladder with each tier's XP cost shown before it is spent, then AI help, then
  the answer reveal.

## Do's and Don'ts

### Do:

- **Do** keep the page on warm paper (#fbfaf7) and reserve white (#ffffff) for
  surfaces that genuinely sit above it.
- **Do** set every span of language data in the data stack, and add a font
  subset before shipping a script the fonts do not cover. The build fails on an
  uncovered character, and that failure is the feature.
- **Do** give wide tables their natural width inside `.table-scroll`, and give
  every direct child of `<body>` `width: 100%` and `min-width: 0`.
- **Do** cap prose by character measure (54ch to 68ch), not by container width.
- **Do** use the global focus treatment: a 2px ink outline at 2px offset.
- **Do** spend Oxblood on cost and error only, and Verdigris on correctness
  only.

### Don't:

- **Don't** introduce a border radius. Every corner is 0px, and the radius
  tokens in `globals.css` are vestigial.
- **Don't** give any control a shadow, and don't add ambient shadow to a card,
  panel or table. The hint popover is the only element in the system that
  carries one.
- **Don't** let the interface drift toward a generic SaaS dashboard: no blue
  accent, no rounded cards, no sidebar chrome, no soft elevation. This is the
  one confirmed rejection.
- **Don't** add a third accent colour. If something needs emphasis and is not a
  cost, an error, or a correct answer, use weight, rule, or ink fill.
- **Don't** reflow or wrap a data table to fit a narrow screen. Column
  alignment is often the problem itself, and breaking it destroys the puzzle.
- **Don't** put an em dash in user-facing copy, and don't use a character the
  self-hosted fonts do not carry. Arrows are the recurring offender: no shipped
  font contains U+2192.
