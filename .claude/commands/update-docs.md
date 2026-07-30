---
description: Update docs/changelog.md and docs/project_status.md to match recent work
argument-hint: [optional note about what changed or which commits to cover]
allowed-tools: Bash(git log:*), Bash(git status:*), Bash(git diff:*), Bash(date:*)
---

Today's date: !`date +%F`

Recent commits:
!`git log --oneline -15`

Uncommitted changes:
!`git status --short`

Changed files across the last few commits:
!`git diff HEAD~5 --stat`

---

Use the **docs-updater** subagent to bring `docs/changelog.md` and `docs/project_status.md` in line with the work shown above. Pass it the context it needs, and have it verify against git rather than trusting any summary.

Scope note from me (may be empty): $ARGUMENTS

Cover work that is not already recorded in those files. Read the existing entries first so nothing gets duplicated or contradicted. Update `docs/architecture.md` only if structure or data flow actually changed.

Do not commit. Report what changed and let me review it.
