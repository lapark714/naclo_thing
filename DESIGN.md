---
name: morpheme
description: A reference grammar you can type into. Past NACLO linguistics problems, set for study.
colors:
  paper: "#ffffff"
  ink: "#000000"
  ink-soft: "#444444"
  ink-faint: "#707070"
  rule: "#e0e0e0"
  rule-strong: "#8a8a8a"
  tint: "#f5f5f5"
  oxblood: "#a4342a"
  oxblood-tint: "#fbeeec"
  cyan: "#00aaee"
  cyan-hover: "#0092cc"
  cyan-deep: "#0b78a9"
  cyan-tint: "#e4f5fd"
  surface: "#ffffff"
  action: "#ff9a04"
  action-hover: "#e08700"
  action-deep: "#a36100"
  action-tint: "#fff3e1"
  action-head: "#cc7a00"
  on-action: "#000000"
  on-good: "#000000"
  select: "#a5ddf5"
typography:
  wordmark:
    fontFamily: '"Wordmark", "Helvetica Neue", Arial, sans-serif'
    fontSize: "3.5rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
  wordmark-sm:
    fontFamily: '"Wordmark", "Helvetica Neue", Arial, sans-serif'
    fontSize: "2.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
  display:
    fontFamily: '"Poppins", Verdana, Geneva, "DejaVu Sans", Tahoma, "Noto Sans", sans-serif'
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.015em"
  headline:
    fontFamily: '"Poppins", Verdana, Geneva, "DejaVu Sans", Tahoma, "Noto Sans", sans-serif'
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  subhead:
    fontFamily: '"Poppins", Verdana, Geneva, "DejaVu Sans", Tahoma, "Noto Sans", sans-serif'
    fontSize: "1.35rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: '"Poppins", Verdana, Geneva, "DejaVu Sans", Tahoma, "Noto Sans", sans-serif'
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: 'Verdana, Geneva, "DejaVu Sans", Tahoma, "Noto Sans", sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  data:
    fontFamily: '"Charis SIL", "Noto Sans Armenian", "Noto Sans Devanagari", "Noto Sans Georgian", "Noto Sans Cherokee", "Noto Sans Ethiopic", "Noto Sans NKo", "Noto Sans JP", "Noto Sans", "Doulos SIL", Charter, Georgia, serif'
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: 'Verdana, Geneva, "DejaVu Sans", Tahoma, "Noto Sans", sans-serif'
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.5
  fine:
    fontFamily: 'Verdana, Geneva, "DejaVu Sans", Tahoma, "Noto Sans", sans-serif'
    fontSize: "0.78rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: 'Verdana, Geneva, "DejaVu Sans", Tahoma, "Noto Sans", sans-serif'
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
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    borderColor: "{colors.action}"
    rounded: "{rounded.none}"
    padding: "16px 32px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.on-good}"
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

The page is a scholarly linguistics volume that happens to accept typing. White
stock, a serif display face used sparingly at the top of a page, and data set
with the care a good grammar gives its example sentences. The subject is a
Warlpiri locative suffix or an Armenian transliteration, and the design's job is
to present that subject accurately and then get out of the way.

Density is closer to a printed page than to an application. Rules are hairlines,
corners are square, and the fills are few: black to mark a control as active,
and NACLO's orange on the primary button and a selected chip. Colour is still
nearly absent in the body of a problem — eight of them are white, black, an
amber title over a cyan rule, and one line of oxblood where something costs XP.
That restraint is what makes the data legible, and the data is the whole
product.

What chromatic colour there is belongs to NACLO. The site is unofficial and
says so, but it is a study tool for one competition, and taking that
competition's own two hues rather than inventing a third is the honest move.
Both are sampled from naclo.org rather than interpreted from it.

The single confirmed rejection is the generic SaaS dashboard: soft shadows,
rounded cards, and sidebar chrome. That rejection once also named "a blue
accent", which no longer applies and must not be read as one: NACLO's own brand
carries a cyan, so a cyan here is fidelity rather than category habit. What the
rejection always meant is a hue chosen because products have one. Beyond that,
no other visual anti-reference has been agreed, so treat category habit as
unresolved rather than forbidden.

**Key Characteristics:**

- NACLO's own white ground (#ffffff) and black text (#000000), taken from
  their stylesheet rather than tuned here
- Square corners everywhere; the radius scale exists in tokens and is unused
- Hairline rules and tonal blocks carry structure instead of shadows
- Serif display for identity, humanist sans for interface, a dedicated
  linguistics face for language data
- Three colour roles, each with a job: action (NACLO orange), correct (NACLO
  cyan), cost/error (oxblood, the one role the brand has no word for)

## Colors

A black-and-white field carrying NACLO's two brand hues, plus one borrowed red.

**The palette is NACLO's, not an interpretation of it.** Neither hue was
sampled from a screenshot or guessed from the logo. `#ff9a04` is declared on
every heading in naclo.org's own stylesheet and is the literal value of 3,634
pixels of their logo artwork; `#00aaee` is declared eight times in that
stylesheet, filling the nav bar and setting every link and every rule under an
h1. The ground is theirs too: a flat `#ffffff` with `#000000` text, with
`#444444` and `#f5f5f5` lifted straight out of the same file.

**One theme, light.** `:root` declares `color-scheme: light`. Keep that
declaration even though there is nothing to switch between: left unset, the
browser reads the machine's setting and repaints its own furniture —
scrollbars, form controls, the overscroll gutter — dark underneath a light
page. It is the only line in `globals.css` that knows a theme ever existed.

A dark theme shipped on 2026-08-21 and was withdrawn on 2026-11-02. Every token
was a two-argument `light-dark()` until then. Bringing it back means restoring
the night column, not adding a `.dark` class, and that column was not an
inversion of this one — its ratios were solved against the night ground rather
than mirrored, because equal WCAG contrast reads as *less* separation near
black. Commit `e5d4b29` is the last one that has it.

### Primary

- **Action** (#ff9a04): NACLO's orange. Action and brand — the primary button,
  a selected filter chip, a link, the `-eme` of the wordmark. 9.88:1 under its
  own black label.
- **Action Head** (#cc7a00): display headings, over a cyan rule. See the
  Section Heading Rule below. The one token carrying a size condition, and the
  one deliberately kept out of `@theme` so no utility class can apply it at
  body size.

### Secondary

- **Cyan** (#00aaee): NACLO's cyan, and this system's word for *correct*. Like
  the orange it is a fill, an outline and an underline rather than a voice: at
  2.63:1 on white it cannot set text.
- **Cyan Deep** (#0b78a9): the cyan that is safe at body size, 4.51:1 on
  `--tint`. Every `correct` and `solved` on the site is set in this, not in the
  vivid value.
- **Cyan Tint** (#e4f5fd): the wash behind a correct row.

### Tertiary

- **Oxblood** (#a4342a): cost and error. The one chromatic role that is not
  NACLO's, kept deliberately. Red for a wrong answer is near-universal, the
  brand offers no substitute for it, and the alternative was spending orange on
  both "press this" and "you got this wrong". 6.77:1 on white. Deep and muted
  rather than alarming, because a student seeing it is mid-problem, not in
  danger.
- **Oxblood Tint** (#fbeeec): the wash behind an incorrect answer row.

### Neutral

- **Paper** (#ffffff): the page ground, NACLO's own white.
- **Ink** (#000000): body text and headings. 21.0:1.
- **Surface** (#ffffff): where a raised thing sits. Equal to the ground, since
  nothing sits above white — see the Lifted Surface Rule.
- **Ink Soft** (#444444): secondary prose, table headers, captions. 9.74:1.
  NACLO's own grey.
- **Ink Faint** (#707070): metadata that should recede — counts, footnotes,
  disabled states. 4.54:1 against `--tint`, the worst ground it lands on.
- **Rule** (#e0e0e0): hairline dividers and table borders.
- **Rule Strong** (#8a8a8a): input and control borders, one step darker than
  Rule so a control reads as interactive against a mere divider. 3.17:1 against
  `--tint`, the worst ground it lands on, which matters because on several
  controls this 1px rule is the only thing marking them.
- **Tint** (#f5f5f5): tonal block for table headers and hover states, the
  substitute for elevation. NACLO's own panel grey.

### Named Rules

**The Every Colour Has A Job Rule.** Three colour roles exist and nothing else
is chromatic. Action (`--action`, never `--accent`: the shadcn scaffold owns
that name and the production minifier will silently take its value) means
action or brand. Cyan means correct. Oxblood means cost or error. If something
needs to stand out and is none of those, it stands out through weight, rule, or
ink fill. Decoration is not a role, and there are no gradients, tinted cards, or
coloured surfaces anywhere.

Two of the three are NACLO's brand hues and one is not, which is the whole
shape of this palette: the brand supplies identity and affirmation, and the
thing it has no word for — being wrong — is borrowed.

A reading-position indicator and a mastery bar are deliberately *not* chromatic.
Both are ink on rule. Position and progress are neither action nor correctness,
and a row of orange bars on the library page would read as decoration on a page
whose job is choosing what to work on next.

An earlier draft added a fourth role, one hue per concept tag, as an index. It
was removed: eight coded dots across a library page read as decoration rather
than as wayfinding, which is the opposite of what colour is for here. Concepts
are named in words, and the words were always doing the work.

**The Vivid Fills, The Deep Writes Rule.** Both brand hues are light. Neither
can set text on white — the orange is 2.13:1 and the cyan 2.63:1 — so each
keeps a deepened twin that can: `--action-deep` and `--good-deep`, both at
4.51:1 against `--tint`. The vivid value fills, outlines and underlines; the
deep value writes. naclo.org does set links in `#00aaee` directly, which is a
real failure on their page and not one worth copying for fidelity's sake.

The wordmark is the one place a vivid value runs below the 3:1 large-text floor
against the ground, and it does it twice: `morph` is cyan at 2.63:1 and `eme`
is orange at 2.13:1. That is deliberate and permitted — WCAG 1.4.3 exempts text
that is part of a logo or brand name. At 56px bold it is entirely legible; it
simply is not held to a ratio meant for prose. The same exemption is why
`--action` may fill a button whose silhouette is 2.13:1 against the page: the
control is identified by its 9.88:1 black label, so 1.4.11 does not ask the
boundary to carry it. A correct inline answer is underlined in `--good` for the
same reason — the word `correct` sits beside it in `--good-deep`.

**The Lifted Surface Rule** (formerly White Means Above). A raised surface is
one tonal step off the ground, and since the ground is `#ffffff` there is no
step above it. So `--surface` *is* the ground, and lift is carried by the
hairline and the shadow already drawn around every one of these things: a
table, an input, the hint popover and an unselected chip each keep a border,
and the ones that float keep a shadow.

The rule survives; only its instrument moved. What it always meant was "this
reads as above the page", and on a white page a rule says that and a fill
cannot. Anything relying on `--surface` alone for separation must carry a
border, or it vanishes into the page. Never write a literal white; the rule was
always about lift, and white only ever encoded that by accident of the ground
being paper.

**The On-Brand-Fill Rule.** Anything filled with `--action` carries
`--on-action`, and anything filled with `--good` carries `--on-good`, never
`--ink`. Both are `#000000`: 9.88:1 on the orange, 7.98:1 on the cyan. Because
both fills take the same black label, the primary button's wipe needs only one
label rather than the two it carried while the wipe was ink.

**The Worst Ground Rule.** A ratio is solved against whichever ground gives a
token the *least* contrast, not against `--paper`. The grounds run `--paper`
#ffffff, `--surface` #ffffff, `--tint` #f5f5f5, plus the composites a hovered
row makes of `--tint` at 50% and 60%. `--tint` is the worst of them, so
`--ink-faint`, `--good-deep`, `--action-deep` and `--rule-strong` are all
solved there. The rule generalises: before adding a colour, list every ground
it can land on and solve the hardest one.

While there were two themes this rule needed stating carefully, because "the
darkest ground" was right by day and backwards at night — the night grounds ran
#141414 < #1f1f1f < #262626 and the worst was the *lightest*, since the ink
above them was light. With one theme the darkest ground is simply the worst
one, but the property to solve for is least contrast, not darkness, and that is
what a restored night column would need again.

Opacity counts as a ground. `text-on-action/70` composites the label into the
fill underneath it, so the pair that matters is the composite against the fill,
not the token against the fill. At 60% that same count was 4.38:1.

**The Section Heading Rule.** NACLO's stylesheet heads every section with
`h1 { color: #ff9a04; border-bottom: solid 1px #00aaee }`, and that
orange-over-cyan pair is the most recognisable thing on their page.
`.section-head` is it, with one compromise: #ff9a04 is 2.13:1 on white, below
even the 3:1 floor large text gets, and a section heading is prose rather than
a logo so it cannot borrow the wordmark's 1.4.3 exemption. `--action-head`
walks the same hue down to 3.31:1.

Only display headings take it — the problem title, `Practice`, `How It Works`,
all at 30px or more. The small uppercase labels that head a working surface,
`QUESTIONS` and `EXPLANATION` and `YOUR MASTERY`, keep `--ink-soft`: at 0.7rem
this orange would owe 4.5:1 and fails it, and they label a surface rather than
opening a section. `.section-head-center` swaps the full-width border for a
short centred rule, because a border under a centred heading spans the column
and stops reading as that heading's underline.


## Typography

**Wordmark Font:** Wordmark, a geometric sans used for the logotype and nothing
else. The brief specifies Gotham, which is licensed and cannot be redistributed,
so what ships is a 5KB subset of Montserrat, the usual stand-in for Gotham in a
lowercase logotype. Swapping in real Gotham is one `src:` line in `globals.css`.

**Display Font:** Poppins, self-hosted, one cut
**Body Font:** Verdana (with Geneva, DejaVu Sans, Tahoma)
**Data Font:** Charis SIL, backed by a stack of Noto script faces and
Doulos SIL

**Character:** A geometric sans for everything that announces, a wide screen
sans for everything that is read, and a third voice reserved entirely for
language data. Charis SIL is a linguistics face: it carries IPA, and its stack
extends into Armenian, Devanagari, Georgian, Cherokee, Ethiopic, N'Ko and
katakana. That third voice is the point of the pairing. A Warlpiri word and the
sentence describing it should not look like the same kind of thing.

Verdana is the one face here that is not downloaded. It is a system font, so on
a desktop it is already present and costs nothing, and Geneva, DejaVu Sans and
Tahoma stand in on the platforms that lack it. What it cannot do is carry a
language: it has no IPA, no Latin Extended-B and no non-Latin script. The
self-hosted Noto stack sits behind it for exactly that reason, and the data
role never moves onto it.

Poppins and the wordmark's Montserrat are both geometric. That reads as a
family relationship rather than a mistake because the wordmark keeps its own
size, tracking and split colour, and because nothing else on the page is set
geometric.

Only one display cut ships (600). Headings do not declare a weight, so the
browser matches to that cut; do not introduce a second display weight without
adding the file.

Display steps from 1.875rem up are tracked -0.015em. Poppins is drawn loose for
interface use, and at heading size that spacing reads as a gap rather than as
air. The 1.35rem and 1.05rem steps are left at normal tracking, because
negative tracking below about 1.5rem costs legibility and buys nothing.

### Hierarchy

- **Wordmark** (700, 3.5rem, -0.02em; 2.75rem below the `sm` breakpoint): The
  logotype, and only the logotype. Ink on paper, because the page is paper. The
  reference art reverses it out of charcoal; that lockup is kept for the app
  icon, never for the page. It steps down on a narrow screen because 3.5rem is
  about 56px, which on a 390px viewport swallows the sentence underneath it.
- **Display** (600, 3rem, 1): Reserved. The landing page's opening is now the
  wordmark, so nothing currently uses this step.
- **Headline** (600, 2.25rem, 1.25): Problem titles.
- **Subhead** (600, 1.35rem, 1.3): The heading of a column or panel that has
  to carry across a wide row, where Title reads as body text and Headline
  reads as a page title.
- **Title** (600, 1.05rem, 1.4): Card and section headings inside a page.
- **Body** (400, 1rem, 1.5): Prose. Measure is capped between 54ch and 68ch
  depending on context, never full container width.
- **Data** (400, 0.95rem, 1.5): Every span of language data, table cell, and
  answer input.
- **Small** (400, 0.85rem, 1.5): Supporting prose that sits beside a primary
  thing rather than carrying it: the guarantee under a call to action, a
  definition list's description, the count next to a button.
- **Fine** (400, 0.78rem, 1.45): Metadata and fine print. Footers, byline
  detail, counts, anything a reader should be able to skip.
- **Label** (600, 0.72rem, 0.14em tracking, uppercase): Section eyebrows,
  table headers, and button text. The primary button is the one exception, at
  0.85rem and 700; see Buttons.

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

Two container widths, chosen by what the surface is for. Reading and solving
surfaces (the practice index, a problem page) hold a single centred column,
48rem (768px) maximum. The landing page runs to 72rem (1152px), because it is
scanned and acted on rather than read top to bottom, and at 48rem on a desktop
it reads as the phone layout with half the screen empty either side. Both use
20px gutters that widen to 32px above the small breakpoint. Vertical rhythm runs on a coarse scale: 40px
between blocks, 64px between major sections, 64px to 96px of page padding on the
landing page.

The column is deliberately narrower than the data it sometimes holds. Wide
tables are not squeezed to fit; they keep their natural width inside a scrolling
container and overflow horizontally within it.

Responsive behaviour is almost entirely one breakpoint (640px). Above it,
gutters widen and the display type steps up. Below it, everything stacks. There is no separate mobile layout and no
navigation to collapse. The landing page adds one more at 1024px, where the
pitch and the worked demo move from stacked to side by side, and each
how-it-works item puts its screenshot beside its description rather than above
it; that is the only place in the system with a second breakpoint. Those items
were a three-across row until the descriptions grew: at 1088px of content, three
columns give a 36ch measure, well under the floor the Measure Rule sets.

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
rule, and a raised surface by its own border — by day it cannot turn white,
because the page already is. There is no elevation scale and no card shadow.

Exactly one shadow exists in the entire system, and it is earned. Controls do
not carry shadow at all: a button signals pressability by inverting its fill,
not by faking a raised edge.

### Shadow Vocabulary

Both recipes take their colour from `--lift-popover-tone` and
`--lift-plate-tone`, which are black at low alpha. They were tokens because the
tone had to answer the theme; with one theme they are simply the two shadow
colours, and the indirection is kept because the geometry is shared and the
alpha is not. The popover's 1px `--ink` border still does most of the
separating and the shadow only seats it, which is why the border is not
optional.

- **Popover lift** (`box-shadow: 0 8px 28px -12px var(--lift-popover-tone)`,
  applied by the `.lift-popover` class): The hint panel only. It genuinely
  floats over the page and must read as detached from the problem underneath.
- **Plate lift** (`box-shadow: 0 14px 30px -16px var(--lift-plate-tone)`): The
  how-it-works screenshots on hover only, never at rest. The same recipe pulled
  tighter and lighter for a 6px rise rather than a floating panel. Both shadows
  are the same idea at two distances; a third value is a new vocabulary and
  needs a better reason than a new component.

### Named Rules

**The Flat Page Rule.** Surfaces are flat at rest, and shadow is what an element
pays for actually leaving the page. Two do: the hint popover, which floats over
the problem, and a hover-lifted plate, which is flat and ruled like everything
else until a pointer picks it up. Nothing carries shadow at rest, and controls
never carry it at all: a button signals pressability by inverting its fill. A
hard zero-blur offset is a neobrutalist costume and this world is not that.

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
- **Primary:** Action fill, `--on-action` label, 1px border in `--action` too,
  16px by 32px padding, uppercase at 0.85rem, 700, 0.12em tracking. No shadow.
  One per page at most; it is the page's single call to action. The border
  matches the fill and is invisible at rest — it exists to be covered, since
  the hover fill is inset -1px so the edge does not stay orange under the
  sweep. It is set in Noto Sans rather than Verdana (`--font-cta`), because
  Verdana runs about 15% wider at this size and the 0.12em tracking compounds
  that until the label sprawls across its box. The count that sits beside it
  shares the face, so the pair reads as one line rather than two typefaces
  meeting. Both are the only text on the site off Verdana; the 0.72rem labels
  stay on it, where the width costs nothing.
- **Primary hover:** `--good` sweeps in from the left, clipped rather than
  faded, and the label stays put. It needs only one label because both fills
  take the same black one — 9.88:1 on the orange, 7.98:1 on the cyan. While the
  sweep was ink it needed two, since paper on the orange is 2.13:1. The button
  carries no cyan at rest: an outline in `--good` was tried and dropped,
  because a brand hue that means *correct* has no business framing a control
  that has not been used yet.
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
  `--on-action` at 70% when selected. Not paper, and not 60%: the count sits on
  an orange fill, and the opacity composites it into that fill rather than over
  the page, which at 60% put it at 4.38:1. See the Worst Ground Rule.

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
- **Submit:** Enter grades a free-text blank that is graded in the browser,
  and such a blank carries no button at all — 359 of the 598 published
  sub-questions, about three in five. A `press enter` label in Ink Faint
  appears beside it once something is typed, so an untouched page stays quiet.
  The button survives only where Enter cannot stand in for it: a choice
  question has nothing to type into, and an `llm` answer is a rate-limited
  network call where a stray Enter mid-sentence spends a grade. The verdict
  sits in an `aria-live="polite"` region, because with no button to move focus
  to, the answer would otherwise be judged in silence.
- **Verdict:** Correct rows wash Cyan Tint, incorrect wash Oxblood Tint. The
  verdict line sits beneath in 0.82rem, coloured Cyan Deep or Oxblood — Cyan
  Deep, never the vivid `--good`, which cannot set text on white. A correct
  inline answer is underlined in `--good` itself, where it is a rule and not a
  voice.
- **Disabled:** 70% opacity, used once an answer is locked.

### Section Headings

- **Style:** `.section-head` — `--action-head`, 0.3em of padding, and a 1px
  `--good` rule beneath. Display sizes only (30px and up).
- **Centred:** add `.section-head-center`, which replaces the border with a
  7rem rule centred under the text.
- **Not this:** small uppercase surface labels. Those stay `--ink-soft` at
  0.72rem with 0.14em tracking, and take no rule.

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

- **Do** keep the page on NACLO's ground, #ffffff. `--surface` equals it, so
  anything relying on `--surface` for separation must also carry a border.
- **Do** solve a new colour against the worst ground it can land on — `--tint`
  and the composites a hovered row makes of it, not `--paper`.
- **Do** leave a problem figure's tone alone. At least one problem's answer is
  which robe is white and which is black, so a tonal inversion is a content
  change, not a style choice.
- **Do** set every span of language data in the data stack, and add a font
  subset before shipping a script the fonts do not cover. The build fails on an
  uncovered character, and that failure is the feature.
- **Do** give wide tables their natural width inside `.table-scroll`, and give
  every direct child of `<body>` `width: 100%` and `min-width: 0`.
- **Do** cap prose by character measure (54ch to 68ch), not by container width.
- **Do** use the global focus treatment: a 2px ink outline at 2px offset.
- **Do** spend Oxblood on cost and error only, and Cyan on correctness only.
- **Do** reach for `--action-deep` / `--good-deep` whenever a brand hue has to
  set text. The vivid values fill, outline and underline; they never write.

### Don't:

- **Don't** write a literal `#ffffff`, a literal `bg-white`, or `text-ink` on an
  action fill. Those are `--surface` and `--on-action`. The literals survived
  for a year because the ground happened to be paper, and dark mode found every
  one of them; the tokens are what keeps that lesson after dark mode's exit.
- **Don't** remove `color-scheme: light` from `:root` now that there is nothing
  to switch. Unset, the browser reads the machine's setting and paints its own
  scrollbars and form controls dark under a light page.
- **Don't** reintroduce dark as a `.dark` class or a second copy of the
  palette. It was one list of `light-dark()` declarations switched by
  `color-scheme`, and if it returns it returns that way — see Colors.
- **Don't** apply `filter: invert()` to any image in `content/assets/`.
  Photographs, engravings and line art sit there with nothing marking them
  apart, and inverting the wrong one changes an answer.
- **Don't** introduce a border radius. Every corner is 0px, and the radius
  tokens in `globals.css` are vestigial.
- **Don't** give any control a shadow, and don't add ambient shadow to a card,
  panel or table. The hint popover is the only element in the system that
  carries one.
- **Don't** let the interface drift toward a generic SaaS dashboard: no
  rounded cards, no sidebar chrome, no soft elevation. This is the one
  confirmed rejection. It once also read "no blue accent"; see the Overview for
  why that clause is retired — NACLO's brand carries a cyan, and `--good` is
  it, so what the rejection bans is a hue chosen because products have one.
- **Don't** add a fourth colour role. If something needs emphasis and is not an
  action, a cost, an error, or a correct answer, use weight, rule, or ink
  fill.
- **Don't** reflow or wrap a data table to fit a narrow screen. Column
  alignment is often the problem itself, and breaking it destroys the puzzle.
- **Don't** put an em dash in user-facing copy, and don't use a character the
  self-hosted fonts do not carry. Arrows are the recurring offender: no shipped
  font contains U+2192.
