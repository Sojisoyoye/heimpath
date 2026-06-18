# GrowthOS Fix Now — Claude Code Workflow

When implementing a GrowthOS fix, follow this exact sequence.

---

## Step 1 — Find the task

Read `.taskmaster/tasks/tasks.json`. Find tasks where:
- `metadata.source === "growthOS"`
- `status === "pending"`

Note the `findingId`, `description`, and `details` (which contains the problem and required fix).

## Step 2 — Read the ship workflow

Read `.claude/skills/ship/SKILL.md` before making any changes.
Follow all conventions it specifies — branch naming, commit style, PR process, CI requirements.

## Step 3 — Read the codebase context

Read relevant files in the HeimPath project before writing anything.

By finding ID:

| findingId | What to read first |
|---|---|
| `ssr` | `frontend/src/`, `frontend/vite.config.ts`, check if Next.js migration is needed |
| `index` | Google Search Console setup docs, `frontend/public/robots.txt`, `frontend/index.html` |
| `og_image` | `frontend/index.html`, `frontend/public/` for existing assets |
| `paywall` | `frontend/src/routes/`, auth middleware, homepage route |
| `meta_desc` | `frontend/index.html`, any SEO config files |
| `title_tag` | `frontend/index.html` |
| `impressum` | `frontend/src/routes/` or `frontend/src/pages/` for routing patterns |
| `privacy` | Same as impressum — routing patterns and existing page structure |
| `disclaimer` | Calculator components in `frontend/src/` |

## Step 4 — Implement the fix

Make only the changes required by the specific finding. Do not refactor unrelated code.

Follow existing patterns exactly:
- Frontend: TypeScript, Tailwind utilities only, PascalCase components, `IProps` interface
- Backend: FastAPI, Pydantic schemas, Alembic for any DB changes
- Never hardcode hex colors — use existing color tokens
- No custom CSS — Tailwind only

## Step 5 — Verify

```bash
# Frontend TypeScript check
cd frontend && bunx tsc --noEmit

# Lint (frontend uses biome)
bun run lint

# Pre-commit (runs ruff, mypy, etc. for backend changes)
pre-commit run --all-files

# Backend tests (if backend was changed)
cd backend && pytest
```

Fix every failure before proceeding.

## Step 6 — Ship (follow the ship skill)

```bash
# Create feature branch
git checkout -b fix/growthOS-<findingId>

# Commit
git add <relevant files>
git commit -m "fix: <short description matching the finding>"

# Push and open PR
git push -u origin fix/growthOS-<findingId>
gh pr create --title "fix: <finding title>" --body "..."
```

## Step 7 — Mark the task done

After the PR is merged, update the task in `.taskmaster/tasks/tasks.json`:
```json
"status": "done",
"updatedAt": "<ISO timestamp>"
```

## Step 8 — Remind about GrowthOS dashboard

After deploying, tell the user:
> "Go to the GrowthOS dashboard → Site Audit → click **✓ Mark Fixed** on the `<findingId>` item to close it in GrowthOS."

---

## Critical rules

- Never break existing functionality
- Never push directly to `main` — always feature branch + PR
- Read the ship workflow before making changes
- If a fix needs a new dependency, check `package.json` and `requirements.txt` first
- TDD for backend changes — write test first
- All CI checks must pass before merge (commitlint, pre-commit, test-backend, SonarCloud)
