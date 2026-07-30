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

### Changed

- `.gitignore` broadened from `.env` to `.env*`

### Notes

- `app/layout.tsx` loads Geist from Google Fonts, left over from the scaffold. The spec requires self-hosted Noto Sans subsets and Charis SIL for IPA, so this must be replaced before any problem content ships.
- `package.json` has no `validate` script yet, though `CLAUDE.md` lists it as a pre-push step.
