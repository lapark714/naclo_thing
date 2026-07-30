# Project Status

This file will hold the project's development status and thus document whatever large updates/accomplishments on the project have been made day-by-day. It is meant to help keep track of where things were left off from the previous day, as a personal reminder.

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

**Deployment notes — four separate gates had to clear**

1. Vercel's GitHub App lacked access to the repo, so no branches appeared
2. Commits carried a fabricated author email (`laurence@MacBook-Air-3.local`); Vercel refuses those. Fixed with `git config --global user.email` plus a new commit — history keeps the old address
3. Deployment Protection was on, redirecting anonymous visitors to a Vercel login
4. The project had no Framework Preset, so `next build` ran and passed but the output was served as a static folder, returning 404 on a green build. Pinned in `vercel.json`

**Where things stand**

The site is live and public, but it is still a placeholder — no content records, no `content/schema.ts`, no ingest run yet. MVP scope is now explicit: individual problems only, no exam assembly. `scripts/ingest/validate.ts` exists and runs, but only checks that files parse as JSON; it exits early since `content/` doesn't exist yet. Zod schema checks, asset-existence checks, and answer-key checks are TODO, blocked on `content/schema.ts`. `pdfs/` holds six problems' worth of raw material (problem + official solution each), untouched by any script.

**Carried over / needs fixing**

- `app/layout.tsx` loads Geist from Google Fonts. The spec requires self-hosted Noto Sans subsets and Charis SIL for IPA — a remote font fetch cannot ship with problem content
- The Vercel project is still named `naclo-thing`, so the URL does not match the `gloss.` name. Renaming it changes the URL, so do it before sharing the link widely
- `npm audit`: 12 high-severity advisories. Most are the ESLint toolchain (`brace-expansion`/`minimatch`), devDependencies only. Three (`postcss`, `sharp`, `next`) are nested under `next` itself, a production dependency — `npm audit fix --force` is the only offered fix and it proposes downgrading to `next@9.3.3`, not viable. Deliberately left, but worth a second look since it's not purely a dev-tooling issue
- `CLAUDE.md` is now just `@AGENTS.md`. The architecture tree, design style guide, UX guidelines, constraints, and repo etiquette that used to live in `CLAUDE.md` are gone from the repo — nothing restores them yet
- `docs/project_spec.md`'s Phase 1 slice description still says "all three timing modes"; that's stale against today's MVP-scope decision (individual problems only, exam mode deferred) and needs reconciling in the spec itself
- The spec's open question — sample a past exam and count what fraction of sub-questions grade with `exact` — is still unanswered and still gates how central `/api/grade` is

**Next up**

1. Sample the downloaded problems (six pairs now in `pdfs/`) and count what fraction of sub-questions can grade with `exact`. Still the spec's open question, still belongs before content work goes further.
2. Write `content/schema.ts` (Zod `Problem`/`Question`) and `content/taxonomy.ts`, then wire real validation into `scripts/ingest/validate.ts`.
3. Run the Phase 1 slice on `pdfs/NACLO-2026-Exam-Problem1.pdf`: transcribe one problem end to end and time it.

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
