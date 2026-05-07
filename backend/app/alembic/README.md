# Alembic Migration Guide

## Rolling-deploy safety rule

HeimPath runs rolling deploys on Azure Container Apps. During the deployment window, old and new containers run simultaneously. Any `op.add_column` with `nullable=False` and no `server_default` will cause old containers to fail on INSERT.

**Required pattern for non-nullable columns:**

```python
op.add_column("table", sa.Column("col", sa.Boolean(), nullable=False, server_default="false"))
```

## 3-Phase Strategy for Breaking Changes

Use this pattern when you need a non-nullable column without a sensible server default, or when backfilling data is required.

### Phase 1 — Add nullable column (deploy safely)

```python
op.add_column("table", sa.Column("col", sa.String(50), nullable=True))
```

### Phase 2 — Backfill + add constraint (after full rollout)

```python
op.execute("UPDATE table SET col = 'default_value' WHERE col IS NULL")
op.alter_column("table", "col", nullable=False)
```

### Phase 3 — Cleanup server_default if needed (optional)

```python
op.alter_column("table", "col", server_default=None)
```

## Naming Convention

`<rev>_<verb>_<description>.py` — e.g. `a1b2c3d4e5f6_add_requires_manual_review_to_document_translation.py`

## Safety Checker

A pre-commit hook automatically runs `backend/scripts/check_migration_safety.py` on every staged migration file. To suppress a check for a known-safe pattern, add `# migration-safety: ok` to the `op.add_column` line.

## Rollback

See [docs/runbooks/migrations.md](../../../docs/runbooks/migrations.md) for step-by-step rollback procedures.
