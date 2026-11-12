# morpheme

Past NACLO linguistics problems, set for study.

**[naclo-prep.vercel.app](https://naclo-prep.vercel.app)**

---

NACLO publishes its past Open Round exams as PDFs. Everything a student needs is
technically available and almost none of it is usable: the archive can't be
searched, you can't pick out one kind of problem, and a stuck solver's only
option is to read the full solution and lose the problem.

morpheme turns that archive into something you can work in. Problems are
transcribed to real HTML with real tables, tagged by concept, and fitted with a
graduated hint ladder, a worked explanation, and grading that happens as you go.

**41 problems · 598 sub-questions · 55 languages · 2016–2026**

## Getting started

```bash
npm install
cp .env.example .env   # fill in ANTHROPIC_API_KEY
npm run dev            # http://localhost:3000
```

The site runs without an API key — you lose free-text grading and request-time
hints, and everything else works.

| | |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build; validates content first |
| `npm run validate` | Check every content record |
| `npm run test` | Ingest pipeline tests |
| `npm run lint` | ESLint |

## How it works

A statically generated Next.js site over JSON files. There is no database.

Problems are drafted offline. Each one is transcribed twice by a model, at
different resolutions and reading orders, and the two passes are cross-checked
against each other and against the booklet's own text layer. A record publishes
only when they agree; anything the checks can't settle parks in
`content/parked/` for a person to resolve, and the site never loads it.

`validate.ts` blocks the build. It checks records against the Zod schema, that
referenced figures exist, that answer keys aren't empty, and that every
character in every problem is covered by a self-hosted font — a missing glyph in
a problem *about* a writing system doesn't make it ugly, it makes it unsolvable.

The only AI at request time is grading. 573 of the 598 sub-questions are matched
in the browser; the remaining 25 are free-text translations that go to
`/api/grade`, which reads the answer key server-side. Those keys never reach the
client bundle.

```
app/              Routes and the two API endpoints
components/       Problem view, question rows, hint popover
content/
  problems/       Published records, in git
  parked/         Records the pipeline couldn't vouch for
  schema.ts       Zod schema, shared by pipeline and site
lib/              Grading, progress, timing, content loading
scripts/ingest/   The offline pipeline — see docs/architecture.md
docs/             Architecture, changelog, project status
public/fonts/     Self-hosted subsets: IPA, Armenian, Devanagari,
                  Georgian, Cherokee, Ethiopic, N'Ko, katakana
```

`DESIGN.md` is the design system. `docs/architecture.md` has the full data flow.

## A note on the source material

This is an **unofficial** project, not affiliated with or endorsed by NACLO.

The problems are theirs. Every problem page carries its original author's byline
and links back to the source PDF at [naclo.org](https://naclo.org). The PDFs
themselves are copyrighted and are not in this repository.

No account is needed and none can be made. Progress lives in your browser's
local storage, nothing is collected, and nothing is shared — a meaningful share
of the audience is under 13, and nothing collected is nothing to leak.
