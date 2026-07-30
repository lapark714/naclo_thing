# Project Status

This file will hold the project's development status and thus document whatever large updates/accomplishments on the project have been made day-by-day. It is meant to help keep track of where things were left off from the previous day, as a personal reminder.

## 2026-07-30

**Done**

- Scaffolded Next.js 16 (App Router, TypeScript, Tailwind, ESLint), `app/` at the repo root
- Replaced the boilerplate landing page with a coming-soon page; set real metadata in `app/layout.tsx`
- Deployed to production and verified it publicly: <https://naclo-thing.vercel.app>

**Deployment notes — four separate gates had to clear**

1. Vercel's GitHub App lacked access to the repo, so no branches appeared
2. Commits carried a fabricated author email (`laurence@MacBook-Air-3.local`); Vercel refuses those. Fixed with `git config --global user.email` plus a new commit — history keeps the old address
3. Deployment Protection was on, redirecting anonymous visitors to a Vercel login
4. The project had no Framework Preset, so `next build` ran and passed but the output was served as a static folder, returning 404 on a green build. Pinned in `vercel.json`

**Where things stand**

The site is live and public, but it is a placeholder only. No content records, no schema, no ingest scripts. Everything below `app/` in the architecture tree is still a target.

**Carried over / needs fixing**

- `app/layout.tsx` loads Geist from Google Fonts. The spec requires self-hosted Noto Sans subsets and Charis SIL for IPA — a remote font fetch cannot ship with problem content
- `package.json` still lacks the `validate` script that `CLAUDE.md` lists as a pre-push step
- `package.json` name is still `naclo-scaffold` from the temp directory

**Next up**

Unchanged from 2026-07-29 below, except that item 2 (scaffold) is now done.

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
