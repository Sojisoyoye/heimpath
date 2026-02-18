resource "azurerm_resource_group" "main" {
  name     = "rg-heimpath-${var.environment}"
  location = var.location

  tags = {
    project     = "heimpath"
    environment = var.environment
  }
}
