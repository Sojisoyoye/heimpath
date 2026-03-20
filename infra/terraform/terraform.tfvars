# ──────────────────────────────────────────────
# Non-secret values only
# Secrets are provided via TF_VAR_* environment variables
# ──────────────────────────────────────────────

subscription_id = "8b21f152-e36b-4d53-9b88-70fc38d906bc"
ghcr_username   = "sojisoyoye"

# Staging database (Neon branch)
staging_postgres_server  = "ep-shy-paper-a9bzjdvq-pooler.gwc.azure.neon.tech"
staging_postgres_user    = "neondb_owner"
staging_first_superuser  = "admin@heimpath.com"

# Production database (Neon branch)
prod_postgres_server  = "ep-long-bread-a9mlfg8t-pooler.gwc.azure.neon.tech"
prod_postgres_user    = "neondb_owner"
prod_first_superuser  = "admin@heimpath.com"
