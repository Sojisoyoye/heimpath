resource "azurerm_log_analytics_workspace" "main" {
  name                = "law-heimpath-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = {
    project     = "heimpath"
    environment = var.environment
  }
}

resource "azurerm_container_app_environment" "main" {
  name                       = "cae-heimpath-${var.environment}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  tags = {
    project     = "heimpath"
    environment = var.environment
  }
}
