# Change Log

All notable changes to the NACLO prep tool will be documented in this file

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

## [Unreleased]

### Added

- Next.js 16 scaffold (App Router, TypeScript, Tailwind, ESLint) with `app/` at the repo root
- Coming-soon landing page at `app/page.tsx`, prerendered as static; site metadata set in `app/layout.tsx`
- `vercel.json` pinning the framework preset to `nextjs`
- First production deploy: <https://naclo-thing.vercel.app>
- `CLAUDE.md`: project goals, target architecture tree, design style guide, UX guidelines, constraints, and repo etiquette
- `docs/architecture.md`: system overview, both data flows (offline ingest and request-time attempt), and the component map
- `docs/changelog.md` and `docs/project_status.md`
- `.env` config for `ANTHROPIC_API_KEY`, ingest and grading models, and the `/api/grade` rate limit
- `.gitignore` coverage for `.env` and the downloaded `/pdfs` directory
- `zod` and `@anthropic-ai/sdk` declared as real dependencies in `package.json` (zod was previously only transitive)
- shadcn/ui initialised on the Radix base: `components.json`, `lib/utils.ts`, `app/globals.css` rewritten to the shadcn token setup
- `tsx` added; `npm run validate` now runs `scripts/ingest/validate.ts` — currently checks only that each `content/problems/*.json` record parses as JSON, exits early since `content/` doesn't exist yet. Zod schema validation, asset-existence checks, and answer-key checks are TODO, blocked on `content/schema.ts`
- `.env.example` added, with a `!.env.example` negation in `.gitignore` so it stays tracked despite the broader `.env*` ignore
- First source PDFs downloaded into `pdfs/` (gitignored): six problems from NACLO 2026, each with its official solution (Problems 1-6). Nothing ingested or transcribed yet

### Changed

- Renamed the site to `gloss.` — browser title in `app/layout.tsx`, landing heading in `app/page.tsx`
- Moved `project_spec.md` and `brainstorm.md` into `docs/`, leaving only tooling-required config at the repo root
- `.gitignore` broadened from `.env` to `.env*`
- `package.json` `name` changed from `naclo-scaffold` to `gloss`
- MVP scope narrowed to individual problems only; full timed exam mode deferred (`docs/architecture.md`). Removed `app/exam/[examId]/page.tsx` from the target tree and the hard-lock behavior from the timer description. `Problem` records still carry `year`, `round`, `officialPoints`, `officialTimeMinutes`, so whole papers can be assembled later without a schema change

### Removed

- Unused create-next-app SVGs from `public/` (`file`, `globe`, `next`, `vercel`, `window`)

### Notes

- `app/layout.tsx` loads Geist from Google Fonts, left over from the scaffold. The spec requires self-hosted Noto Sans subsets and Charis SIL for IPA, so this must be replaced before any problem content ships.
- `npm audit`: 12 high-severity advisories. 9 trace through the ESLint toolchain (`brace-expansion`/`minimatch`), devDependencies only, never shipped. The other 3 (`postcss`, `sharp`, `next` itself) are nested under `next`, a production dependency — `sharp` is next's optional image-optimization dep, `postcss` is next's own internal copy (build-time only). `npm audit fix --force` is the only fix path offered, and it proposes downgrading to `next@9.3.3`, which is not viable. Deliberately left; worth a closer look since it touches a prod dependency, not just dev tooling.
- `CLAUDE.md` is now just `@AGENTS.md` — the architecture tree, design style guide, UX guidelines, constraints, and repo etiquette that used to live there are gone from the repo.
