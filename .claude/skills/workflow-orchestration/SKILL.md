---
name: workflow-orchestration
description: Defines how Claude should approach tasks in HeimPath — planning, subagent usage, self-improvement, verification, elegance, bug fixing, and task management. Load this at the start of any non-trivial work session.
---

# Workflow Orchestration

## 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

## 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

## 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

## 4. Test-Driven Development (TDD)
- **Write tests first** before implementing feature code
- Red → Green → Refactor: write a failing test, make it pass, then clean up
- Never adjust a test to make it pass — fix the implementation instead
- Tests define the contract; implementation fulfills it
- For backend: pytest tests covering happy path, edge cases, and error handling
- For frontend: component tests where meaningful, integration via API contract
- Run the full relevant test suite before marking work as done

## 5. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

## 6. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

## 7. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Task Management

1. **Plan First:** Enter plan mode for non-trivial tasks, write specs upfront
2. **Verify Plan:** Check in before starting implementation
3. **TDD:** Write tests first, then implement to make them pass
4. **Track Progress:** Use task tracking to mark items complete as you go
5. **Explain Changes:** High-level summary at each step
6. **Capture Lessons:** Update `tasks/lessons.md` after corrections

---

## Git Workflow (Mandatory)

**Never push directly to `main`.** Branch protection is enforced — direct pushes will be rejected.

### Flow for every change

```bash
# 1. Create a feature branch
git checkout -b feature/my-feature   # or bugfix/, refactor/, infra/, chore/

# 2. Make changes, commit with conventional commits
git add <files>
git commit -m "feat: add something"

# 3. Push branch
git push -u origin feature/my-feature

# 4. Open PR — use the code-reviewer skill to review before merging
gh pr create --title "..." --body "..."

# 5. Ensure CI passes (test-backend, commitlint, pre-commit)

# 6. Merge
gh pr merge --squash
```

### Required CI checks (must pass before merge)

| Check | What it validates |
|-------|------------------|
| `commitlint` | Conventional commit format |
| `pre-commit` | Biome (frontend), ruff (backend), SDK generation |
| `test-backend` | Backend unit + integration tests |

### Code review

Use the `code-reviewer` skill to review your own PR before merging:
- Load the skill, pass it the diff/PR number
- Fix any Blockers before merging; address Warnings where practical

---

## Core Principles

- **Simplicity First:** Make every change as simple as possible. Impact minimal code.
- **No Laziness:** Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact:** Changes should only touch what's necessary. Avoid introducing bugs.
