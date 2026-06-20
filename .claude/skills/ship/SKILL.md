---
name: ship
description: Autonomous dev cycle — picks next task, implements, raises PR, reviews, fixes, ensures CI/SonarCloud pass, merges, then loops to the next task. Invoke with /ship to start. Optionally pass a task number or description as argument.
user_invocable: true
---

# Ship — Autonomous Development Cycle

Run the full implement-review-merge loop autonomously. No hand-holding required.

---

## The Cycle

Repeat until stopped or no tasks remain:

### Phase 1: Pick Task

- If an argument was provided (task number or description), use that
- Otherwise, ask the **product-manager** skill for the next task to implement
- If using Taskmaster, call `mcp__task-master-ai__next_task` to find the next unblocked task
- Announce what you're building before starting

### Phase 2: Implement

- Load **senior-software-engineer** skill context
- Enter plan mode for non-trivial tasks (3+ files or architectural decisions)
- Implement the feature end-to-end following project standards
- Run `bunx tsc --noEmit` (frontend) and/or `pytest` (backend) as applicable
- Run `pre-commit run --all-files` to catch lint/format issues
- Create feature branch, commit (conventional commits, lowercase subject), push, open PR via `gh pr create`

### Phase 3: Review

- Load **code-reviewer** skill and review the PR (`/review <pr-number>`)
- The review will produce Blockers, Warnings, Suggestions, and Nitpicks

### Phase 4: Fix All Issues

- Load **senior-software-engineer** skill context
- Fix **every** finding from the review — blockers, warnings, suggestions, and nitpicks. Leave nothing unfixed no matter how small
- Run verification again (`tsc`, `pre-commit`)
- Amend or add fixup commit, push

### Phase 5: Re-Review

- Load **code-reviewer** skill and review the PR again
- If new issues found, go back to Phase 4
- Repeat until the review is clean

### Phase 6: CI & SonarCloud

- Run `gh pr checks <pr-number> --watch` to wait for all CI checks
- If any check fails (commitlint, pre-commit, test-backend, SonarCloud, etc.):
  - Diagnose the failure
  - Fix it (load **senior-software-engineer** context)
  - Push and re-check
- Continue until all checks pass including SonarCloud quality gate

### Phase 7: Final Review

- Load **code-reviewer** skill one last time to confirm everything is clean
- If issues found, go back to Phase 4

### Phase 8: Merge

- `gh pr merge <pr-number> --squash --delete-branch`
- Confirm merge succeeded

### Phase 9: Next Task

- Go back to Phase 1 and pick the next task
- Continue the cycle

---

## Rules

- **Never push directly to main** — always feature branch + PR
- **Never skip reviews** — every PR gets reviewed before merge
- **Never leave issues unfixed** — fix all findings, no matter how minor
- **Never merge with failing CI** — all checks must be green
- Commit messages: conventional commits, lowercase subject, max 72 chars
- No "Generated with Claude Code" in PR descriptions
- No "Co-Authored-By: Claude" in commit messages
- Run the app with `docker compose` unless told otherwise
- When amending commits after review fixes, use `--force-with-lease` for push
