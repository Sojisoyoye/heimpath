# Migration Rollback Runbook

## When to Use This

Use this runbook when a migration has been applied but needs to be reversed — e.g., a bad column type, wrong constraint, or data corruption.

## Staging (Neon branch)

Neon creates a branch per PR. To roll back:

1. Identify the previous revision: `alembic history --verbose | head -20`
2. Run downgrade: `alembic downgrade -1` (one step) or `alembic downgrade <rev>` (to specific revision)
3. Verify: `alembic current`

## Production (Neon main branch)

**STOP: Get sign-off from a second engineer before proceeding.**

1. Scale down the app to 0 replicas to prevent writes during rollback:
   ```bash
   az containerapp update --name heimpath-api --resource-group heimpath-prod --min-replicas 0 --max-replicas 0
   ```
2. Take a database snapshot via the Neon console before any changes.
3. Run the downgrade:
   ```bash
   DATABASE_URL=<prod_url> alembic downgrade -1
   ```
4. Deploy the previous app version (or revert code that depended on the migrated schema).
5. Scale replicas back up.
6. Monitor error rates for 10 minutes.

## Emergency: Data Loss or Corruption

1. Immediately scale app to 0 replicas.
2. In Neon console: use **Branch Restore** to restore the database branch to a point-in-time before the bad migration.
3. Re-deploy the previous app version.
4. Investigate root cause before re-applying migration.
