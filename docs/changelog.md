# Change Log

All notable changes to the NACLO prep tool will be documented in this file

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

## [Unreleased]

### Added

- `CLAUDE.md`: project goals, target architecture tree, design style guide, UX guidelines, constraints, and repo etiquette
- `docs/architecture.md`: system overview, both data flows (offline ingest and request-time attempt), and the component map
- `docs/changelog.md` and `docs/project_status.md`
- `.env` config for `ANTHROPIC_API_KEY`, ingest and grading models, and the `/api/grade` rate limit
- `.gitignore` coverage for `.env` and the downloaded `/pdfs` directory

### Notes

- No application code yet. No `package.json`, no Next.js scaffold; the repo is spec and docs only.
