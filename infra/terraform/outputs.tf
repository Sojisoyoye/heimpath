# ──────────────────────────────────────────────
# Shared outputs
# ──────────────────────────────────────────────

output "container_app_environment_id" {
  value = azurerm_container_app_environment.main.id
}

# ──────────────────────────────────────────────
# Staging outputs
# ──────────────────────────────────────────────

output "staging_resource_group_name" {
  value = azurerm_resource_group.staging.name
}

output "staging_backend_fqdn" {
  value = azurerm_container_app.staging_backend.ingress[0].fqdn
}

output "staging_frontend_fqdn" {
  value = azurerm_container_app.staging_frontend.ingress[0].fqdn
}

output "staging_backend_url" {
  value = "https://${azurerm_container_app.staging_backend.ingress[0].fqdn}"
}

output "staging_frontend_url" {
  value = "https://${azurerm_container_app.staging_frontend.ingress[0].fqdn}"
}

# ──────────────────────────────────────────────
# Production outputs
# ──────────────────────────────────────────────

output "prod_resource_group_name" {
  value = azurerm_resource_group.prod.name
}

output "prod_backend_fqdn" {
  value = azurerm_container_app.prod_backend.ingress[0].fqdn
}

output "prod_frontend_fqdn" {
  value = azurerm_container_app.prod_frontend.ingress[0].fqdn
}

output "prod_backend_url" {
  value = "https://${azurerm_container_app.prod_backend.ingress[0].fqdn}"
}

output "prod_frontend_url" {
  value = "https://${azurerm_container_app.prod_frontend.ingress[0].fqdn}"
}
