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
                              Neon DB        Redis
                           (PostgreSQL)  (self-hosted)
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
POSTGRES_SERVER=host.docker.internal  # self-hosted on VPS; use Neon endpoint for Neon
POSTGRES_PORT=5432
POSTGRES_DB=heimpath               # heimpath_staging for staging
POSTGRES_USER=heimpath_user
POSTGRES_PASSWORD=<strong-random>
DATABASE_USE_SSL=false             # false for self-hosted localhost Postgres; true for Neon
REDIS_PASSWORD=<strong-random>
SECRET_KEY=<random-64-char-hex>
FIRST_SUPERUSER=admin@heimpath.com
FIRST_SUPERUSER_PASSWORD=<secure-password>
```

> **Self-hosted Postgres:** Set `POSTGRES_SERVER=host.docker.internal` so Docker containers reach the host's Postgres. Set `DATABASE_USE_SSL=false` — no TLS is configured on the local instance.
>
> **Neon (legacy):** Use the unpooled endpoint (no `-pooler` suffix) and `DATABASE_USE_SSL=true`. PgBouncer's transaction-mode pooler rejects psycopg3's `statement_timeout` startup parameter.

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

## Database — Neon PostgreSQL

Two separate Neon projects (one per environment) in the Azure Germany West Central region.

| Environment | Neon endpoint (unpooled) |
|-------------|--------------------------|
| Production | `ep-long-bread-a9mlfg8t.gwc.azure.neon.tech` |
| Staging | `ep-shy-paper-a9bzjdvq.gwc.azure.neon.tech` |

Credentials are stored only in the respective `.env` files on the VPS — never committed.

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
