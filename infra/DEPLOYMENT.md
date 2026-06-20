# HeimPath Deployment Guide

This document describes the current production and staging infrastructure.

## Architecture Overview

```
                    Cloudflare DNS
                         │
          ┌──────────────┴──────────────┐
          │                             │
    heimpath.com                 api.heimpath.com
    staging.heimpath.com         api.staging.heimpath.com
          │                             │
        Vercel                    Hetzner VPS
    (Frontend SPA)            (Caddy + Docker Compose)
          │                             │
   VITE_API_URL ──────────────► FastAPI Backend
                                        │
                                 ┌──────┴──────┐
                                 │             │
                           PostgreSQL 16     Redis
                           (self-hosted      (self-hosted
                            on VPS)          on VPS)
```

## Frontend — Vercel

Two Vercel projects are configured under the `soji-soyoyes-projects` scope:

| Project | Domain | Environment variable |
|---------|--------|---------------------|
| `heimpath` | `heimpath.com`, `www.heimpath.com` | `VITE_API_URL=https://api.heimpath.com` |
| `heimpath-staging` | `staging.heimpath.com` | `VITE_API_URL=https://api.staging.heimpath.com` |

### Deploy frontend

```bash
cd frontend

# Production
vercel deploy --prod

# Staging — update .vercel/project.json to point to heimpath-staging, then:
vercel deploy --prod
```

The `frontend/.vercel/project.json` tracks the currently linked project (project and org IDs only — no credentials). Switch between projects by updating `projectId` in that file. The auth token lives in `~/.local/share/com.vercel.cli/auth.json` and must never be committed.

### SPA routing

`frontend/vercel.json` contains the catch-all rewrite required for TanStack Router:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## Backend — Hetzner VPS

The backend runs on a Hetzner VPS with Caddy as the reverse proxy. Both production and staging share the same host.

### Services (`docker-compose.prod.yml`)

| Container | Description | Port |
|-----------|-------------|------|
| `heimpath-backend` | Production FastAPI app | 8000 (internal) |
| `heimpath-backend-staging` | Staging FastAPI app | 8001 (internal) |
| `heimpath-redis-1` | Production Redis (Celery broker) | internal |
| `heimpath-redis-staging-1` | Staging Redis | internal |
| `heimpath-celery-worker-1` | Production Celery worker | — |
| `heimpath-celery-beat-1` | Production Celery beat scheduler | — |
| `heimpath-celery-worker-staging-1` | Staging Celery worker | — |
| `heimpath-celery-beat-staging-1` | Staging Celery beat | — |

Caddy (running in the `modish_modish` Docker network on the same host) reverse-proxies:
- `api.heimpath.com` → `heimpath-backend:8000`
- `api.staging.heimpath.com` → `heimpath-backend-staging:8000`

### VPS access

```bash
ssh -i ~/.ssh/hetzner_modish root@178.104.122.53
```

### Environment files

| File | Used by |
|------|---------|
| `/opt/heimpath/.env` | Production services |
| `/opt/heimpath/.env.staging` | Staging services |

These files are **not committed** to the repository. See `.env.example` for required variables.

Key variables to set per environment:

```
ENVIRONMENT=production             # or staging
DOMAIN=heimpath.com                # or staging.heimpath.com
POSTGRES_SERVER=host.docker.internal
POSTGRES_PORT=5432
POSTGRES_DB=heimpath               # heimpath_staging for staging
POSTGRES_USER=heimpath_user
POSTGRES_PASSWORD=<strong-random>
DATABASE_USE_SSL=false
REDIS_PASSWORD=<strong-random>
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379  # redis-staging:6379 for staging
SECRET_KEY=<random-64-char-hex>
FIRST_SUPERUSER=soji.soyoye@gmail.com  # admin@heimpath.com for staging
FIRST_SUPERUSER_PASSWORD=<secure-password>
BACKEND_CORS_ORIGINS=https://heimpath.com,https://www.heimpath.com,https://staging.heimpath.com
```

> **CORS:** `BACKEND_CORS_ORIGINS` must include **both** `https://heimpath.com` and `https://www.heimpath.com` — Vercel serves the frontend on both. Missing `www` causes a CORS error for users who land on the www subdomain.
>
> **REDIS_URL:** The `backend` service reads `REDIS_URL` from `.env` (not computed by docker-compose), so it must be set explicitly with the actual password expanded. The `celery-worker` and `celery-beat` services compute it at compose-time via `environment:`.
>
> **Staging credentials:** superuser is `admin@heimpath.com` / see password manager.

### Deploying a backend update

```bash
# 1. Sync code
rsync -av --exclude='.git' --exclude='node_modules' --exclude='__pycache__' \
  --exclude='.env*' \
  ./ root@<VPS_HOST>:/opt/heimpath/

# 2. Rebuild and restart production
ssh root@<VPS_HOST> "cd /opt/heimpath && \
  docker-compose -f docker-compose.prod.yml up -d --build --force-recreate backend celery-worker celery-beat"

# 3. Rebuild and restart staging
# Note: staging services live in docker-compose.staging.yml — both -f flags required
ssh root@<VPS_HOST> "cd /opt/heimpath && \
  docker-compose -f docker-compose.prod.yml -f docker-compose.staging.yml up -d --build --force-recreate backend-staging celery-worker-staging celery-beat-staging"
```

### Database migrations

Migrations run automatically via the `prestart` service when containers start. To run manually:

```bash
# Production migrations
ssh root@<VPS_HOST> "cd /opt/heimpath && \
  docker-compose -f docker-compose.prod.yml run --rm prestart"

# Staging migrations
ssh root@<VPS_HOST> "cd /opt/heimpath && \
  docker-compose -f docker-compose.prod.yml -f docker-compose.staging.yml run --rm prestart-staging"
```

Alembic is configured with `transaction_per_migration=True` to safely handle enum additions across separate transactions.

---

## Database — Self-Hosted PostgreSQL 16

PostgreSQL 16 runs directly on the Hetzner VPS (`/var/lib/postgresql/16/main`).

| Environment | Database | User |
|-------------|----------|------|
| Production | `heimpath` | `heimpath_user` |
| Staging | `heimpath_staging` | `heimpath_staging_user` |

Docker containers reach the host Postgres via `host.docker.internal` (mapped to `host-gateway` in `extra_hosts`). SSL is disabled (`DATABASE_USE_SSL=false`) since the connection is local.

Credentials are stored only in the respective `.env` files on the VPS — never committed.

> **Neon decommission:** After 2026-06-17, archive Neon credentials to password manager and delete both Neon projects via the Neon console.

### Database Backups

Nightly compressed backups run at 02:00 via cron under the `postgres` OS user.

| What | Where |
|------|-------|
| Script | `/usr/local/bin/pg-backup.sh` |
| Output | `/backups/postgres/{db}_{date}.sql.gz` |
| Retention | 7 days (older files auto-deleted) |
| Log | `/var/log/pg-backup.log` |

**Manual backup:**
```bash
sudo -u postgres /usr/local/bin/pg-backup.sh
```

**Restore to a temp DB (verify integrity):**
```bash
sudo -u postgres createdb heimpath_restore_test
sudo -u postgres bash -c "gunzip -c /backups/postgres/heimpath_$(date +%F).sql.gz | psql -q heimpath_restore_test"
# Check row counts, then:
sudo -u postgres dropdb heimpath_restore_test
```

**Restore to production** (after data loss incident):
```bash
# 1. Stop the backend
cd /opt/heimpath && docker-compose -f docker-compose.prod.yml stop backend celery-worker celery-beat

# 2. Drop and recreate the database
sudo -u postgres psql -c "DROP DATABASE heimpath;"
sudo -u postgres psql -c "CREATE DATABASE heimpath OWNER heimpath_user;"
sudo -u postgres psql -c "GRANT ALL ON DATABASE heimpath TO heimpath_user;"

# 3. Restore from latest backup
sudo -u postgres bash -c "gunzip -c /backups/postgres/heimpath_$(date +%F).sql.gz | psql -q heimpath"

# 4. Restart services (prestart re-applies any missing migrations)
docker-compose -f docker-compose.prod.yml up -d
```

---

## VPS Monitoring

Two cron jobs run on the VPS to catch disk and process issues early.

### Disk & Swap & Postgres Health (`disk-check.sh`)

Runs at **08:00 daily** (root crontab). Logs to `/var/log/disk-alert.log`.

| Alert condition | Threshold |
|-----------------|-----------|
| Root filesystem | ≥ 70% |
| Swap usage | ≥ 90% |
| Postgres process | not `active` |

```bash
# Check current status
tail -20 /var/log/disk-alert.log

# Run manually
/usr/local/bin/disk-check.sh
```

If disk hits 70%: prune old Docker images (`docker image prune -a`) and check backup volume.
If swap hits 90%: consider upgrading VPS to CX32 (4 vCPU / 8 GB, ~€14.49/month) via Hetzner Cloud console — live resize, ~2 min downtime.
If Postgres alert fires: `systemctl status postgresql` and `journalctl -u postgresql -n 50`.

### Log Rotation

`/etc/logrotate.d/heimpath-postgres` rotates weekly, keeps 8 weeks, gzip:
- `/var/log/pg-backup.log`
- `/var/log/disk-alert.log`
- `/var/log/pg-health.log`

PostgreSQL's own logs (`/var/log/postgresql/`) are handled by the system `/etc/logrotate.d/postgresql-common`.

---

## DNS — Cloudflare

All DNS is managed in Cloudflare. Required records:

| Type | Name | Value | Notes |
|------|------|-------|-------|
| `A` | `@` (heimpath.com) | `76.76.21.21` | Vercel |
| `CNAME` | `www` | `cname.vercel-dns.com` | Vercel |
| `CNAME` | `staging` | `cname.vercel-dns.com` | Vercel |
| `A` | `api` | `<VPS IP>` | Hetzner backend |
| `A` | `api.staging` | `<VPS IP>` | Hetzner staging backend |

---

## Cross-Origin Cookies

The frontend (Vercel) and backend (Hetzner) are on separate origins. Cookies are configured as follows in the backend:

- `SameSite=None; Secure=True` for all auth cookies in non-local environments
- `Domain=.heimpath.com` on the non-HttpOnly `logged_in` indicator cookie so it is readable from all subdomains

This is set automatically when `ENVIRONMENT != "local"`.

---

## Security Notes

- Never commit `.env`, `.env.staging`, or any file containing secrets
- Redis passwords, DB passwords, and secret keys are stored only on the VPS in `/opt/heimpath/`
- Caddy handles TLS certificate provisioning automatically via Let's Encrypt
- The `logged_in` cookie is intentionally non-HttpOnly (UI indicator only — contains no sensitive data)
- Avatar files are served from the backend without authentication; they are keyed by UUID only

---

## Azure Teardown Runbook

Azure Container Apps, Redis, Key Vaults, and related resources have been decommissioned.
The Terraform config in `infra/terraform/` has been emptied of resource blocks.
Run the steps below **once** to destroy any remaining Azure resources and clean up.

### Prerequisites

Export the Azure service principal credentials from the `AZURE_CREDENTIALS` GitHub secret
(JSON with `clientId`, `clientSecret`, `subscriptionId`, `tenantId`):

```bash
export ARM_CLIENT_ID="<clientId>"
export ARM_CLIENT_SECRET="<clientSecret>"
export ARM_SUBSCRIPTION_ID="<subscriptionId>"
export ARM_TENANT_ID="<tenantId>"
```

Verify the service principal is still active before proceeding (a revoked SP will cause
`terraform init -migrate-state` to fail at the blob-read step with no easy recovery):

```bash
az login --service-principal \
  -u "$ARM_CLIENT_ID" -p "$ARM_CLIENT_SECRET" --tenant "$ARM_TENANT_ID"
az account set --subscription "$ARM_SUBSCRIPTION_ID"
az account show   # should print subscription details; if this fails, renew the SP first
```

### Step 1 — Migrate state from Azure blob to local

All subsequent terraform commands must be run from `infra/terraform/`.

```bash
cd infra/terraform
terraform init -migrate-state
# Confirm "yes" when prompted to copy state to local backend
```

State is now stored in `infra/terraform/terraform.tfstate` (do not commit this file).
**Back it up immediately** before running apply — if the file is lost, resources must be
cleaned up manually via the Azure portal:

```bash
cp terraform.tfstate terraform.tfstate.manual-backup
```

### Step 2 — Destroy all Azure resources

Run from `infra/terraform/`:

```bash
terraform apply
# Review the destroy plan — all resources should show as "will be destroyed"
# Confirm "yes"
```

Both Key Vaults are soft-deleted by `terraform apply` and must be purged manually.

`kv-heimpath-prod` has `purge_protection_enabled = true` with a 30-day retention.
Azure **blocks** `az keyvault purge` for the entire retention window — the command will
return a `409 Conflict` until day 30. Run it now to start the clock; re-run it after
30 days to complete the purge.

`kv-heimpath-staging` has `purge_protection_enabled = false` (7-day retention) — purge
succeeds immediately so the name is released from the namespace at once:

```bash
az keyvault purge --name kv-heimpath-prod --location germanywestcentral
az keyvault purge --name kv-heimpath-staging --location germanywestcentral
```

### Step 3 — Delete the tfstate storage account

The `heimpathtfstate` storage account was bootstrapped outside Terraform and is not in state.
Delete it manually after the apply succeeds:

```bash
az group delete --name rg-heimpath-tfstate --yes --no-wait
```

### Step 4 — Remove AZURE_CREDENTIALS GitHub secret

```bash
gh secret delete AZURE_CREDENTIALS --repo Sojisoyoye/heimpath
```

### Step 5 — Delete the terraform directory

Once all Azure resources are confirmed destroyed:

```bash
rm -rf infra/terraform/
```

Then open a PR removing the `infra/terraform/` directory from the repository.
