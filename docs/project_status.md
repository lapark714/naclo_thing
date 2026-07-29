# Project Status

This file will hold the project's development status and thus document whatever large updates/accomplishments on the project have been made day-by-day. It is meant to help keep track of where things were left off from the previous day, as a personal reminder.

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
3. Write `content/schema.ts` from the Zod model in `project_spec.md`, plus `content/taxonomy.ts` for the concept and form tag vocabulary.
4. Start the Phase 1 slice: transcribe one problem end to end and time it, since that number decides whether the full archive is a month of work or a year.
