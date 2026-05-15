# ──────────────────────────────────────────────
# Production environment
# ──────────────────────────────────────────────

resource "azurerm_resource_group" "prod" {
  name     = "rg-heimpath-prod"
  location = var.location

  tags = {
    project     = "heimpath"
    environment = "prod"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# ── Redis ─────────────────────────────────────

resource "azurerm_redis_cache" "prod" {
  name                 = "heimpath-redis-prod"
  location             = azurerm_resource_group.prod.location
  resource_group_name  = azurerm_resource_group.prod.name
  capacity             = 0
  family               = "C"
  sku_name             = "Basic"
  non_ssl_port_enabled = false
  minimum_tls_version  = "1.2"

  redis_configuration {}

  tags = {
    project     = "heimpath"
    environment = "prod"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# ── Backend ──────────────────────────────────

resource "azurerm_container_app" "prod_backend" {
  name                         = "heimpath-backend-prod"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.prod.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.prod_backend.id]
  }

  registry {
    server               = "ghcr.io"
    username             = var.ghcr_username
    password_secret_name = "ghcr-password"
  }

  secret {
    name  = "ghcr-password"
    value = var.ghcr_password
  }

  secret {
    name  = "postgres-password"
    value = var.prod_postgres_password
  }

  # secret-key is now read from Key Vault at runtime
  secret {
    name                = "secret-key"
    key_vault_secret_id = azurerm_key_vault_secret.prod_secret_key.versionless_id
    identity            = azurerm_user_assigned_identity.prod_backend.id
  }

  secret {
    name  = "first-superuser-password"
    value = var.prod_first_superuser_password
  }

  secret {
    name  = "redis-url"
    value = "rediss://:${azurerm_redis_cache.prod.primary_access_key}@${azurerm_redis_cache.prod.hostname}:${azurerm_redis_cache.prod.ssl_port}/0"
  }

  dynamic "secret" {
    for_each = var.prod_sentry_dsn != "" ? [1] : []
    content {
      name  = "sentry-dsn"
      value = var.prod_sentry_dsn
    }
  }

  dynamic "secret" {
    for_each = var.prod_smtp_password != "" ? [1] : []
    content {
      name  = "smtp-password"
      value = var.prod_smtp_password
    }
  }

  dynamic "secret" {
    for_each = var.prod_stripe_secret_key != "" ? [1] : []
    content {
      name                = "stripe-secret-key"
      key_vault_secret_id = azurerm_key_vault_secret.prod_stripe_secret_key[0].versionless_id
      identity            = azurerm_user_assigned_identity.prod_backend.id
    }
  }

  dynamic "secret" {
    for_each = var.prod_anthropic_api_key != "" ? [1] : []
    content {
      name                = "anthropic-api-key"
      key_vault_secret_id = azurerm_key_vault_secret.prod_anthropic_api_key[0].versionless_id
      identity            = azurerm_user_assigned_identity.prod_backend.id
    }
  }

  dynamic "secret" {
    for_each = var.prod_azure_translator_key != "" ? [1] : []
    content {
      name                = "azure-translator-key"
      key_vault_secret_id = azurerm_key_vault_secret.prod_azure_translator_key[0].versionless_id
      identity            = azurerm_user_assigned_identity.prod_backend.id
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8000
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = var.prod_backend_min_replicas
    max_replicas = var.prod_backend_max_replicas

    container {
      name   = "backend"
      image  = var.prod_backend_image
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "ENVIRONMENT"
        value = "production"
      }

      env {
        name  = "PROJECT_NAME"
        value = var.project_name
      }

      env {
        name  = "POSTGRES_SERVER"
        value = var.prod_postgres_server
      }

      env {
        name  = "POSTGRES_PORT"
        value = tostring(var.prod_postgres_port)
      }

      env {
        name  = "POSTGRES_USER"
        value = var.prod_postgres_user
      }

      env {
        name        = "POSTGRES_PASSWORD"
        secret_name = "postgres-password"
      }

      env {
        name  = "POSTGRES_DB"
        value = var.prod_postgres_db
      }

      env {
        name        = "SECRET_KEY"
        secret_name = "secret-key"
      }

      env {
        name  = "FIRST_SUPERUSER"
        value = var.prod_first_superuser
      }

      env {
        name        = "FIRST_SUPERUSER_PASSWORD"
        secret_name = "first-superuser-password"
      }

      env {
        name  = "FRONTEND_HOST"
        value = var.prod_frontend_url
      }

      env {
        name  = "DOMAIN"
        value = var.domain
      }

      env {
        name  = "WEB_CONCURRENCY"
        value = "2"
      }

      env {
        name        = "REDIS_URL"
        secret_name = "redis-url"
      }

      dynamic "env" {
        for_each = var.prod_sentry_dsn != "" ? [1] : []
        content {
          name        = "SENTRY_DSN"
          secret_name = "sentry-dsn"
        }
      }

      dynamic "env" {
        for_each = var.prod_smtp_host != "" ? [1] : []
        content {
          name  = "SMTP_HOST"
          value = var.prod_smtp_host
        }
      }

      dynamic "env" {
        for_each = var.prod_smtp_user != "" ? [1] : []
        content {
          name  = "SMTP_USER"
          value = var.prod_smtp_user
        }
      }

      dynamic "env" {
        for_each = var.prod_smtp_password != "" ? [1] : []
        content {
          name        = "SMTP_PASSWORD"
          secret_name = "smtp-password"
        }
      }

      dynamic "env" {
        for_each = var.prod_emails_from_email != "" ? [1] : []
        content {
          name  = "EMAILS_FROM_EMAIL"
          value = var.prod_emails_from_email
        }
      }

      dynamic "env" {
        for_each = var.prod_stripe_secret_key != "" ? [1] : []
        content {
          name        = "STRIPE_SECRET_KEY"
          secret_name = "stripe-secret-key"
        }
      }

      dynamic "env" {
        for_each = var.prod_anthropic_api_key != "" ? [1] : []
        content {
          name        = "ANTHROPIC_API_KEY"
          secret_name = "anthropic-api-key"
        }
      }

      dynamic "env" {
        for_each = var.prod_azure_translator_key != "" ? [1] : []
        content {
          name        = "AZURE_TRANSLATOR_KEY"
          secret_name = "azure-translator-key"
        }
      }
    }
  }

  tags = {
    project     = "heimpath"
    environment = "prod"
  }
}

# ── Frontend ─────────────────────────────────

resource "azurerm_container_app" "prod_frontend" {
  name                         = "heimpath-frontend-prod"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.prod.name
  revision_mode                = "Single"

  registry {
    server               = "ghcr.io"
    username             = var.ghcr_username
    password_secret_name = "ghcr-password"
  }

  secret {
    name  = "ghcr-password"
    value = var.ghcr_password
  }

  ingress {
    external_enabled = true
    target_port      = 80
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = var.prod_frontend_min_replicas
    max_replicas = var.prod_frontend_max_replicas

    container {
      name   = "frontend"
      image  = var.prod_frontend_image
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "BACKEND_HOST"
        value = "https://${azurerm_container_app.prod_backend.ingress[0].fqdn}"
      }
    }
  }

  tags = {
    project     = "heimpath"
    environment = "prod"
  }
}

# ── Migration Job ────────────────────────────

resource "azurerm_container_app_job" "prod_migration" {
  name                         = "heimpath-migrate-prod"
  location                     = azurerm_resource_group.prod.location
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.prod.name
  replica_timeout_in_seconds   = 300
  replica_retry_limit          = 1
  manual_trigger_config {
    parallelism              = 1
    replica_completion_count = 1
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.prod_backend.id]
  }

  registry {
    server               = "ghcr.io"
    username             = var.ghcr_username
    password_secret_name = "ghcr-password"
  }

  secret {
    name  = "ghcr-password"
    value = var.ghcr_password
  }

  secret {
    name  = "postgres-password"
    value = var.prod_postgres_password
  }

  secret {
    name                = "secret-key"
    key_vault_secret_id = azurerm_key_vault_secret.prod_secret_key.versionless_id
    identity            = azurerm_user_assigned_identity.prod_backend.id
  }

  secret {
    name  = "first-superuser-password"
    value = var.prod_first_superuser_password
  }

  template {
    container {
      name   = "migration"
      image  = var.prod_backend_image
      cpu    = 0.25
      memory = "0.5Gi"

      command = ["bash", "scripts/prestart.sh"]

      env {
        name  = "ENVIRONMENT"
        value = "production"
      }

      env {
        name  = "PROJECT_NAME"
        value = var.project_name
      }

      env {
        name  = "POSTGRES_SERVER"
        value = var.prod_postgres_server
      }

      env {
        name  = "POSTGRES_PORT"
        value = tostring(var.prod_postgres_port)
      }

      env {
        name  = "POSTGRES_USER"
        value = var.prod_postgres_user
      }

      env {
        name        = "POSTGRES_PASSWORD"
        secret_name = "postgres-password"
      }

      env {
        name  = "POSTGRES_DB"
        value = var.prod_postgres_db
      }

      env {
        name        = "SECRET_KEY"
        secret_name = "secret-key"
      }

      env {
        name  = "FIRST_SUPERUSER"
        value = var.prod_first_superuser
      }

      env {
        name        = "FIRST_SUPERUSER_PASSWORD"
        secret_name = "first-superuser-password"
      }
    }
  }

  tags = {
    project     = "heimpath"
    environment = "prod"
  }
}

# ── Scheduled Jobs ───────────────────────────

resource "azurerm_container_app_job" "prod_weekly_digest" {
  name                         = "heimpath-weekly-digest-prod"
  location                     = azurerm_resource_group.prod.location
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.prod.name
  replica_timeout_in_seconds   = 1800
  replica_retry_limit          = 1

  schedule_trigger_config {
    cron_expression          = "0 6 * * 1" # Mondays 06:00 UTC
    parallelism              = 1
    replica_completion_count = 1
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.prod_backend.id]
  }

  registry {
    server               = "ghcr.io"
    username             = var.ghcr_username
    password_secret_name = "ghcr-password"
  }

  secret {
    name  = "ghcr-password"
    value = var.ghcr_password
  }

  secret {
    name  = "postgres-password"
    value = var.prod_postgres_password
  }

  secret {
    name                = "secret-key"
    key_vault_secret_id = azurerm_key_vault_secret.prod_secret_key.versionless_id
    identity            = azurerm_user_assigned_identity.prod_backend.id
  }

  dynamic "secret" {
    for_each = var.prod_smtp_password != "" ? [1] : []
    content {
      name  = "smtp-password"
      value = var.prod_smtp_password
    }
  }

  template {
    container {
      name    = "weekly-digest"
      image   = var.prod_backend_image
      cpu     = 0.25
      memory  = "0.5Gi"
      command = ["python", "-m", "app.cli", "send-weekly-digest"]

      env {
        name  = "ENVIRONMENT"
        value = "production"
      }

      env {
        name  = "PROJECT_NAME"
        value = var.project_name
      }

      env {
        name  = "POSTGRES_SERVER"
        value = var.prod_postgres_server
      }

      env {
        name  = "POSTGRES_PORT"
        value = tostring(var.prod_postgres_port)
      }

      env {
        name  = "POSTGRES_USER"
        value = var.prod_postgres_user
      }

      env {
        name        = "POSTGRES_PASSWORD"
        secret_name = "postgres-password"
      }

      env {
        name  = "POSTGRES_DB"
        value = var.prod_postgres_db
      }

      env {
        name        = "SECRET_KEY"
        secret_name = "secret-key"
      }

      env {
        name  = "FRONTEND_HOST"
        value = var.prod_frontend_url
      }

      dynamic "env" {
        for_each = var.prod_smtp_host != "" ? [1] : []
        content {
          name  = "SMTP_HOST"
          value = var.prod_smtp_host
        }
      }

      dynamic "env" {
        for_each = var.prod_smtp_user != "" ? [1] : []
        content {
          name  = "SMTP_USER"
          value = var.prod_smtp_user
        }
      }

      dynamic "env" {
        for_each = var.prod_smtp_password != "" ? [1] : []
        content {
          name        = "SMTP_PASSWORD"
          secret_name = "smtp-password"
        }
      }

      dynamic "env" {
        for_each = var.prod_emails_from_email != "" ? [1] : []
        content {
          name  = "EMAILS_FROM_EMAIL"
          value = var.prod_emails_from_email
        }
      }
    }
  }

  tags = {
    project     = "heimpath"
    environment = "prod"
  }
}

resource "azurerm_container_app_job" "prod_deadline_reminders" {
  name                         = "heimpath-deadline-reminders-prod"
  location                     = azurerm_resource_group.prod.location
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.prod.name
  replica_timeout_in_seconds   = 600
  replica_retry_limit          = 1

  schedule_trigger_config {
    cron_expression          = "0 8 * * *" # Daily 08:00 UTC
    parallelism              = 1
    replica_completion_count = 1
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.prod_backend.id]
  }

  registry {
    server               = "ghcr.io"
    username             = var.ghcr_username
    password_secret_name = "ghcr-password"
  }

  secret {
    name  = "ghcr-password"
    value = var.ghcr_password
  }

  secret {
    name  = "postgres-password"
    value = var.prod_postgres_password
  }

  secret {
    name                = "secret-key"
    key_vault_secret_id = azurerm_key_vault_secret.prod_secret_key.versionless_id
    identity            = azurerm_user_assigned_identity.prod_backend.id
  }

  dynamic "secret" {
    for_each = var.prod_smtp_password != "" ? [1] : []
    content {
      name  = "smtp-password"
      value = var.prod_smtp_password
    }
  }

  template {
    container {
      name    = "deadline-reminders"
      image   = var.prod_backend_image
      cpu     = 0.25
      memory  = "0.5Gi"
      command = ["python", "-m", "app.cli", "send-deadline-reminders"]

      env {
        name  = "ENVIRONMENT"
        value = "production"
      }

      env {
        name  = "PROJECT_NAME"
        value = var.project_name
      }

      env {
        name  = "POSTGRES_SERVER"
        value = var.prod_postgres_server
      }

      env {
        name  = "POSTGRES_PORT"
        value = tostring(var.prod_postgres_port)
      }

      env {
        name  = "POSTGRES_USER"
        value = var.prod_postgres_user
      }

      env {
        name        = "POSTGRES_PASSWORD"
        secret_name = "postgres-password"
      }

      env {
        name  = "POSTGRES_DB"
        value = var.prod_postgres_db
      }

      env {
        name        = "SECRET_KEY"
        secret_name = "secret-key"
      }

      env {
        name  = "FRONTEND_HOST"
        value = var.prod_frontend_url
      }

      dynamic "env" {
        for_each = var.prod_smtp_host != "" ? [1] : []
        content {
          name  = "SMTP_HOST"
          value = var.prod_smtp_host
        }
      }

      dynamic "env" {
        for_each = var.prod_smtp_user != "" ? [1] : []
        content {
          name  = "SMTP_USER"
          value = var.prod_smtp_user
        }
      }

      dynamic "env" {
        for_each = var.prod_smtp_password != "" ? [1] : []
        content {
          name        = "SMTP_PASSWORD"
          secret_name = "smtp-password"
        }
      }

      dynamic "env" {
        for_each = var.prod_emails_from_email != "" ? [1] : []
        content {
          name  = "EMAILS_FROM_EMAIL"
          value = var.prod_emails_from_email
        }
      }
    }
  }

  tags = {
    project     = "heimpath"
    environment = "prod"
  }
}

# ── Custom Domains ───────────────────────────

resource "azurerm_container_app_custom_domain" "prod_frontend" {
  count = var.prod_frontend_subdomain != "" ? 1 : 0

  name                                     = "${var.prod_frontend_subdomain}.${var.domain}"
  container_app_id                         = azurerm_container_app.prod_frontend.id
  container_app_environment_certificate_id = null # Uses managed certificate

  lifecycle {
    ignore_changes = [
      container_app_environment_certificate_id,
      certificate_binding_type,
    ]
  }
}

resource "azurerm_container_app_custom_domain" "prod_backend" {
  count = var.prod_backend_subdomain != "" ? 1 : 0

  name                                     = "${var.prod_backend_subdomain}.${var.domain}"
  container_app_id                         = azurerm_container_app.prod_backend.id
  container_app_environment_certificate_id = null # Uses managed certificate

  lifecycle {
    ignore_changes = [
      container_app_environment_certificate_id,
      certificate_binding_type,
    ]
  }
}
