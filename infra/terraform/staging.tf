# ──────────────────────────────────────────────
# Staging environment
# ──────────────────────────────────────────────

resource "azurerm_resource_group" "staging" {
  name     = "rg-heimpath-staging"
  location = var.location

  tags = {
    project     = "heimpath"
    environment = "staging"
  }
}

# ── Backend ──────────────────────────────────

resource "azurerm_container_app" "staging_backend" {
  name                         = "heimpath-backend-staging"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.staging.name
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

  secret {
    name  = "postgres-password"
    value = var.staging_postgres_password
  }

  secret {
    name  = "secret-key"
    value = var.staging_secret_key
  }

  secret {
    name  = "first-superuser-password"
    value = var.staging_first_superuser_password
  }

  dynamic "secret" {
    for_each = var.staging_sentry_dsn != "" ? [1] : []
    content {
      name  = "sentry-dsn"
      value = var.staging_sentry_dsn
    }
  }

  dynamic "secret" {
    for_each = var.staging_smtp_password != "" ? [1] : []
    content {
      name  = "smtp-password"
      value = var.staging_smtp_password
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
    min_replicas = var.staging_backend_min_replicas
    max_replicas = var.staging_backend_max_replicas

    container {
      name   = "backend"
      image  = var.staging_backend_image
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "ENVIRONMENT"
        value = "staging"
      }

      env {
        name  = "PROJECT_NAME"
        value = var.project_name
      }

      env {
        name  = "POSTGRES_SERVER"
        value = var.staging_postgres_server
      }

      env {
        name  = "POSTGRES_PORT"
        value = tostring(var.staging_postgres_port)
      }

      env {
        name  = "POSTGRES_USER"
        value = var.staging_postgres_user
      }

      env {
        name        = "POSTGRES_PASSWORD"
        secret_name = "postgres-password"
      }

      env {
        name  = "POSTGRES_DB"
        value = var.staging_postgres_db
      }

      env {
        name        = "SECRET_KEY"
        secret_name = "secret-key"
      }

      env {
        name  = "FIRST_SUPERUSER"
        value = var.staging_first_superuser
      }

      env {
        name        = "FIRST_SUPERUSER_PASSWORD"
        secret_name = "first-superuser-password"
      }

      env {
        name  = "FRONTEND_HOST"
        value = var.staging_frontend_url
      }

      env {
        name  = "WEB_CONCURRENCY"
        value = "1"
      }

      dynamic "env" {
        for_each = var.staging_sentry_dsn != "" ? [1] : []
        content {
          name        = "SENTRY_DSN"
          secret_name = "sentry-dsn"
        }
      }

      dynamic "env" {
        for_each = var.staging_smtp_host != "" ? [1] : []
        content {
          name  = "SMTP_HOST"
          value = var.staging_smtp_host
        }
      }

      dynamic "env" {
        for_each = var.staging_smtp_user != "" ? [1] : []
        content {
          name  = "SMTP_USER"
          value = var.staging_smtp_user
        }
      }

      dynamic "env" {
        for_each = var.staging_smtp_password != "" ? [1] : []
        content {
          name        = "SMTP_PASSWORD"
          secret_name = "smtp-password"
        }
      }

      dynamic "env" {
        for_each = var.staging_emails_from_email != "" ? [1] : []
        content {
          name  = "EMAILS_FROM_EMAIL"
          value = var.staging_emails_from_email
        }
      }
    }
  }

  tags = {
    project     = "heimpath"
    environment = "staging"
  }
}

# ── Frontend ─────────────────────────────────

resource "azurerm_container_app" "staging_frontend" {
  name                         = "heimpath-frontend-staging"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.staging.name
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
    min_replicas = var.staging_frontend_min_replicas
    max_replicas = var.staging_frontend_max_replicas

    container {
      name   = "frontend"
      image  = var.staging_frontend_image
      cpu    = 0.25
      memory = "0.5Gi"
    }
  }

  tags = {
    project     = "heimpath"
    environment = "staging"
  }
}

# ── Migration Job ────────────────────────────

resource "azurerm_container_app_job" "staging_migration" {
  name                         = "heimpath-migrate-staging"
  location                     = azurerm_resource_group.staging.location
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.staging.name
  replica_timeout_in_seconds   = 300
  replica_retry_limit          = 1
  manual_trigger_config {
    parallelism              = 1
    replica_completion_count = 1
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
    value = var.staging_postgres_password
  }

  secret {
    name  = "secret-key"
    value = var.staging_secret_key
  }

  secret {
    name  = "first-superuser-password"
    value = var.staging_first_superuser_password
  }

  template {
    container {
      name   = "migration"
      image  = var.staging_backend_image
      cpu    = 0.25
      memory = "0.5Gi"

      command = ["bash", "scripts/prestart.sh"]

      env {
        name  = "ENVIRONMENT"
        value = "staging"
      }

      env {
        name  = "PROJECT_NAME"
        value = var.project_name
      }

      env {
        name  = "POSTGRES_SERVER"
        value = var.staging_postgres_server
      }

      env {
        name  = "POSTGRES_PORT"
        value = tostring(var.staging_postgres_port)
      }

      env {
        name  = "POSTGRES_USER"
        value = var.staging_postgres_user
      }

      env {
        name        = "POSTGRES_PASSWORD"
        secret_name = "postgres-password"
      }

      env {
        name  = "POSTGRES_DB"
        value = var.staging_postgres_db
      }

      env {
        name        = "SECRET_KEY"
        secret_name = "secret-key"
      }

      env {
        name  = "FIRST_SUPERUSER"
        value = var.staging_first_superuser
      }

      env {
        name        = "FIRST_SUPERUSER_PASSWORD"
        secret_name = "first-superuser-password"
      }
    }
  }

  tags = {
    project     = "heimpath"
    environment = "staging"
  }
}

# ── Custom Domains ───────────────────────────

resource "azurerm_container_app_custom_domain" "staging_frontend" {
  count = var.staging_frontend_subdomain != "" ? 1 : 0

  name                                     = "${var.staging_frontend_subdomain}.${var.domain}"
  container_app_id                         = azurerm_container_app.staging_frontend.id
  container_app_environment_certificate_id = null # Uses managed certificate

  lifecycle {
    ignore_changes = [
      container_app_environment_certificate_id,
    ]
  }
}

resource "azurerm_container_app_custom_domain" "staging_backend" {
  count = var.staging_backend_subdomain != "" ? 1 : 0

  name                                     = "${var.staging_backend_subdomain}.${var.domain}"
  container_app_id                         = azurerm_container_app.staging_backend.id
  container_app_environment_certificate_id = null # Uses managed certificate

  lifecycle {
    ignore_changes = [
      container_app_environment_certificate_id,
    ]
  }
}
