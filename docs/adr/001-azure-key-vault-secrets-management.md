# ADR 001 — Azure Key Vault for Secrets Management

**Date:** 2026-05-15
**Status:** Accepted
**Deciders:** Engineering team

---

## Context

All application secrets (STRIPE_SECRET_KEY, ANTHROPIC_API_KEY, AZURE_TRANSLATOR_KEY,
SECRET_KEY, POSTGRES_PASSWORD) are currently stored as plain-text values in:

1. **Azure Container App inline secrets** — visible to anyone with Contributor access to
   the resource group, and logged in Container App audit events.
2. **Terraform state file** — stored in the `heimpathtfstate` Azure Storage Account.
   A compromised storage account exposes all secrets simultaneously.
3. **Local `.env` files** — risk of accidental commit or developer machine exposure.

This creates a broad blast radius: a single point of compromise (state file, subscription
access, developer machine) exposes every secret at once.

---

## Decision

Adopt **Azure Key Vault** (standard tier) with **User-Assigned Managed Identity** for
secrets management. Secrets are stored in Key Vault and injected into Container Apps and
Jobs at runtime via Key Vault references — secret values no longer appear in Container App
inline configuration, reducing the blast radius of a compromised resource group.

> **Note:** `azurerm_key_vault_secret` resources store the `value` attribute in Terraform
> state (marked sensitive; not printed to CLI). The Terraform state file in
> `heimpathtfstate` still holds plaintext values for KV-managed secrets. Phase 2 will
> evaluate managing secrets out-of-band and using `data "azurerm_key_vault_secret"` to
> eliminate values from state entirely.

### Architecture

```
                    ┌─────────────────────────┐
                    │  Terraform (CI/CD SP)    │
                    │  Role: KV Secrets Officer│
                    └────────────┬────────────┘
                                 │ writes secrets once
                    ┌────────────▼────────────┐
                    │     Azure Key Vault      │
                    │  - Audit log via Azure   │
                    │    Monitor (AuditEvent)  │
                    │  - RBAC authorisation    │
                    │  - Soft-delete + purge   │
                    │    protection (prod)     │
                    └────────────┬────────────┘
                                 │ versionless secret ref
          ┌──────────────────────┼──────────────────────┐
          │                      │                       │
┌─────────▼──────┐    ┌──────────▼──────┐    ┌──────────▼──────┐
│  Backend App   │    │  Migration Job  │    │  Scheduled Jobs │
│  (Managed ID)  │    │  (Managed ID)   │    │  (Managed ID)   │
│ Role: KV Secrets│   │ Role: KV Secrets│    │ Role: KV Secrets│
│ User           │    │ User            │    │ User            │
└────────────────┘    └─────────────────┘    └─────────────────┘
```

### Secret classification

| Secret | Stored in | Rationale |
|--------|-----------|-----------|
| `SECRET_KEY` (JWT signing) | Key Vault | High sensitivity — compromise allows token forgery |
| `STRIPE_SECRET_KEY` | Key Vault | High sensitivity — payment processing |
| `ANTHROPIC_API_KEY` | Key Vault | High sensitivity — billable API access |
| `AZURE_TRANSLATOR_KEY` | Key Vault | High sensitivity — billable API access |
| `POSTGRES_PASSWORD` | Inline (phase 2) | Lower immediate risk; DB is network-isolated |
| `REDIS_URL` (incl. access key) | Inline (phase 2) | Same rationale as DB |
| `GHCR_PASSWORD` | Inline | Registry auth; short-lived tokens preferred |
| `FIRST_SUPERUSER_PASSWORD` | Inline | One-time setup; rotated immediately after first login |
| `SMTP_PASSWORD` | Inline | Lower risk; no financial exposure |
| `SENTRY_DSN` | Inline | Not sensitive; public project DSN |

Postgres and Redis will be migrated in a follow-up (phase 2) once Key Vault integration
is validated in staging.

### Per-environment isolation

Each environment (staging, prod) gets its own Key Vault and Managed Identity.
This prevents a staging credential from being used against production.

| Resource | Staging | Production |
|----------|---------|------------|
| Key Vault | `kv-heimpath-staging` | `kv-heimpath-prod` |
| Managed Identity | `id-heimpath-backend-staging` | `id-heimpath-backend-prod` |
| Soft-delete retention | 7 days | 30 days |
| Purge protection | disabled | enabled |

---

## Consequences

### Positive

- **Reduced blast radius** — compromising the Terraform state or Container App
  configuration no longer exposes high-value API keys.
- **Audit trail** — every secret read is logged to Log Analytics via Azure Monitor
  diagnostic settings (`AuditEvent` category).
- **Secret rotation without redeployment** — updating a secret in Key Vault is
  picked up on the next container restart without a Terraform `apply`.
- **RBAC isolation** — the backend identity has read-only access (`Key Vault Secrets User`);
  only the CI/CD service principal can write secrets (`Key Vault Secrets Officer`).

### Negative / Trade-offs

- **Additional Azure cost** — Key Vault standard tier ~$0.03 per 10K operations.
  At HeimPath's current scale this is negligible (<$1/month).
- **Bootstrap complexity** — the first `terraform apply` must write the secrets into
  Key Vault before the Container App can start; CI pipelines must supply all secret
  variables on initial provisioning. Azure RBAC propagation can take 1-2 minutes after
  the role assignment is created; on a fresh deployment the secret write may fail with
  an insufficient-privileges error on the first apply and succeed on a re-run.
- **Soft-delete behaviour** — deleted Key Vault secrets enter a soft-delete state;
  reprovisioning with the same name requires purging the old secret first (or using
  a new name). This is managed by Terraform's `azurerm_key_vault_secret` lifecycle.

---

## Alternatives considered

### A. Leave secrets as Container App inline secrets
Rejected. Inline secrets appear in Terraform state and are visible to all Contributor-level
principals. No audit trail on access.

### B. Azure App Configuration (not Key Vault)
Rejected. App Configuration is designed for non-sensitive configuration values. It does
support Key Vault references internally but adds an extra abstraction layer without benefit.

### C. HashiCorp Vault (self-hosted)
Rejected. Operational overhead of running Vault on Azure is disproportionate to the
current team size. Azure Key Vault is a fully managed equivalent integrated with Entra ID.
