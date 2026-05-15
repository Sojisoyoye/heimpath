# ──────────────────────────────────────────────
# Azure Key Vault — secrets management
# ADR: docs/adr/001-azure-key-vault-secrets-management.md
#
# Phase 1 secrets in Key Vault:
#   secret-key, stripe-secret-key, anthropic-api-key, azure-translator-key
#
# Phase 2 (future): postgres-password, redis-url
# ──────────────────────────────────────────────

data "azurerm_client_config" "current" {}

# ── Staging ───────────────────────────────────

resource "azurerm_user_assigned_identity" "staging_backend" {
  name                = "id-heimpath-backend-staging"
  location            = azurerm_resource_group.staging.location
  resource_group_name = azurerm_resource_group.staging.name

  tags = {
    project     = "heimpath"
    environment = "staging"
  }
}

resource "azurerm_key_vault" "staging" {
  name                = "kv-heimpath-staging"
  location            = azurerm_resource_group.staging.location
  resource_group_name = azurerm_resource_group.staging.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  soft_delete_retention_days = 7
  purge_protection_enabled   = false
  enable_rbac_authorization  = true

  tags = {
    project     = "heimpath"
    environment = "staging"
  }
}

# CI/CD service principal can write secrets
resource "azurerm_role_assignment" "staging_kv_terraform" {
  scope                = azurerm_key_vault.staging.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

# Backend managed identity can read secrets at runtime
resource "azurerm_role_assignment" "staging_kv_backend" {
  scope                = azurerm_key_vault.staging.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.staging_backend.principal_id
}

resource "azurerm_key_vault_secret" "staging_secret_key" {
  name         = "secret-key"
  value        = var.staging_secret_key
  key_vault_id = azurerm_key_vault.staging.id

  depends_on = [azurerm_role_assignment.staging_kv_terraform]
}

resource "azurerm_key_vault_secret" "staging_stripe_secret_key" {
  count        = var.staging_stripe_secret_key != "" ? 1 : 0
  name         = "stripe-secret-key"
  value        = var.staging_stripe_secret_key
  key_vault_id = azurerm_key_vault.staging.id

  depends_on = [azurerm_role_assignment.staging_kv_terraform]
}

resource "azurerm_key_vault_secret" "staging_anthropic_api_key" {
  count        = var.staging_anthropic_api_key != "" ? 1 : 0
  name         = "anthropic-api-key"
  value        = var.staging_anthropic_api_key
  key_vault_id = azurerm_key_vault.staging.id

  depends_on = [azurerm_role_assignment.staging_kv_terraform]
}

resource "azurerm_key_vault_secret" "staging_azure_translator_key" {
  count        = var.staging_azure_translator_key != "" ? 1 : 0
  name         = "azure-translator-key"
  value        = var.staging_azure_translator_key
  key_vault_id = azurerm_key_vault.staging.id

  depends_on = [azurerm_role_assignment.staging_kv_terraform]
}

# Audit log: every secret read is captured in Log Analytics
resource "azurerm_monitor_diagnostic_setting" "staging_kv" {
  name                       = "kv-diag-staging"
  target_resource_id         = azurerm_key_vault.staging.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "AuditEvent"
  }

  metric {
    category = "AllMetrics"
  }
}

# ── Production ─────────────────────────────────

resource "azurerm_user_assigned_identity" "prod_backend" {
  name                = "id-heimpath-backend-prod"
  location            = azurerm_resource_group.prod.location
  resource_group_name = azurerm_resource_group.prod.name

  tags = {
    project     = "heimpath"
    environment = "prod"
  }
}

resource "azurerm_key_vault" "prod" {
  name                = "kv-heimpath-prod"
  location            = azurerm_resource_group.prod.location
  resource_group_name = azurerm_resource_group.prod.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  soft_delete_retention_days = 30
  purge_protection_enabled   = true
  enable_rbac_authorization  = true

  tags = {
    project     = "heimpath"
    environment = "prod"
  }
}

resource "azurerm_role_assignment" "prod_kv_terraform" {
  scope                = azurerm_key_vault.prod.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "prod_kv_backend" {
  scope                = azurerm_key_vault.prod.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.prod_backend.principal_id
}

resource "azurerm_key_vault_secret" "prod_secret_key" {
  name         = "secret-key"
  value        = var.prod_secret_key
  key_vault_id = azurerm_key_vault.prod.id

  depends_on = [azurerm_role_assignment.prod_kv_terraform]
}

resource "azurerm_key_vault_secret" "prod_stripe_secret_key" {
  count        = var.prod_stripe_secret_key != "" ? 1 : 0
  name         = "stripe-secret-key"
  value        = var.prod_stripe_secret_key
  key_vault_id = azurerm_key_vault.prod.id

  depends_on = [azurerm_role_assignment.prod_kv_terraform]
}

resource "azurerm_key_vault_secret" "prod_anthropic_api_key" {
  count        = var.prod_anthropic_api_key != "" ? 1 : 0
  name         = "anthropic-api-key"
  value        = var.prod_anthropic_api_key
  key_vault_id = azurerm_key_vault.prod.id

  depends_on = [azurerm_role_assignment.prod_kv_terraform]
}

resource "azurerm_key_vault_secret" "prod_azure_translator_key" {
  count        = var.prod_azure_translator_key != "" ? 1 : 0
  name         = "azure-translator-key"
  value        = var.prod_azure_translator_key
  key_vault_id = azurerm_key_vault.prod.id

  depends_on = [azurerm_role_assignment.prod_kv_terraform]
}

resource "azurerm_monitor_diagnostic_setting" "prod_kv" {
  name                       = "kv-diag-prod"
  target_resource_id         = azurerm_key_vault.prod.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "AuditEvent"
  }

  metric {
    category = "AllMetrics"
  }
}
