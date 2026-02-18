resource "azurerm_container_app_job" "migration" {
  name                         = "heimpath-migrate-${var.environment}"
  location                     = azurerm_resource_group.main.location
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
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

  template {
    container {
      name   = "migration"
      image  = var.backend_image
      cpu    = 0.25
      memory = "0.5Gi"

      command = ["bash", "scripts/prestart.sh"]

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
    }
  }

  tags = {
    project     = "heimpath"
    environment = var.environment
  }
}
