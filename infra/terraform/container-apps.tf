resource "azurerm_container_app" "backend" {
  name                         = "heimpath-backend-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
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
    value = var.postgres_password
  }

  secret {
    name  = "secret-key"
    value = var.secret_key
  }

  secret {
    name  = "first-superuser-password"
    value = var.first_superuser_password
  }

  dynamic "secret" {
    for_each = var.sentry_dsn != "" ? [1] : []
    content {
      name  = "sentry-dsn"
      value = var.sentry_dsn
    }
  }

  dynamic "secret" {
    for_each = var.smtp_password != "" ? [1] : []
    content {
      name  = "smtp-password"
      value = var.smtp_password
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
    min_replicas = var.backend_min_replicas
    max_replicas = var.backend_max_replicas

    container {
      name   = "backend"
      image  = var.backend_image
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      env {
        name  = "PROJECT_NAME"
        value = var.project_name
      }

      env {
        name  = "POSTGRES_SERVER"
        value = var.postgres_server
      }

      env {
        name  = "POSTGRES_PORT"
        value = tostring(var.postgres_port)
      }

      env {
        name  = "POSTGRES_USER"
        value = var.postgres_user
      }

      env {
        name        = "POSTGRES_PASSWORD"
        secret_name = "postgres-password"
      }

      env {
        name  = "POSTGRES_DB"
        value = var.postgres_db
      }

      env {
        name        = "SECRET_KEY"
        secret_name = "secret-key"
      }

      env {
        name  = "FIRST_SUPERUSER"
        value = var.first_superuser
      }

      env {
        name        = "FIRST_SUPERUSER_PASSWORD"
        secret_name = "first-superuser-password"
      }

      env {
        name  = "FRONTEND_HOST"
        value = var.frontend_url
      }

      env {
        name  = "WEB_CONCURRENCY"
        value = "1"
      }

      dynamic "env" {
        for_each = var.sentry_dsn != "" ? [1] : []
        content {
          name        = "SENTRY_DSN"
          secret_name = "sentry-dsn"
        }
      }

      dynamic "env" {
        for_each = var.smtp_host != "" ? [1] : []
        content {
          name  = "SMTP_HOST"
          value = var.smtp_host
        }
      }

      dynamic "env" {
        for_each = var.smtp_user != "" ? [1] : []
        content {
          name  = "SMTP_USER"
          value = var.smtp_user
        }
      }

      dynamic "env" {
        for_each = var.smtp_password != "" ? [1] : []
        content {
          name        = "SMTP_PASSWORD"
          secret_name = "smtp-password"
        }
      }

      dynamic "env" {
        for_each = var.emails_from_email != "" ? [1] : []
        content {
          name  = "EMAILS_FROM_EMAIL"
          value = var.emails_from_email
        }
      }
    }
  }

  tags = {
    project     = "heimpath"
    environment = var.environment
  }
}

resource "azurerm_container_app" "frontend" {
  name                         = "heimpath-frontend-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
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
    min_replicas = var.frontend_min_replicas
    max_replicas = var.frontend_max_replicas

    container {
      name   = "frontend"
      image  = var.frontend_image
      cpu    = 0.25
      memory = "0.5Gi"
    }
  }

  tags = {
    project     = "heimpath"
    environment = var.environment
  }
}
