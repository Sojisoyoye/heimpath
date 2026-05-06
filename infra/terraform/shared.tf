# ──────────────────────────────────────────────
# Shared infrastructure (resource group, LAW, CAE)
# ──────────────────────────────────────────────

resource "azurerm_resource_group" "shared" {
  name     = "rg-heimpath-shared"
  location = var.location

  tags = {
    project = "heimpath"
  }
}

resource "azurerm_log_analytics_workspace" "main" {
  name                = "law-heimpath"
  location            = azurerm_resource_group.shared.location
  resource_group_name = azurerm_resource_group.shared.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = {
    project = "heimpath"
  }
}

resource "azurerm_container_app_environment" "main" {
  name                       = "cae-heimpath"
  location                   = azurerm_resource_group.shared.location
  resource_group_name        = azurerm_resource_group.shared.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  tags = {
    project = "heimpath"
  }
}
