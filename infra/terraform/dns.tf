# Custom domain bindings for Container Apps
# Prerequisites: CNAME and TXT (asuid) records must be configured in Namecheap DNS
# before applying these resources.
#
# Required DNS records (configure in Namecheap):
#   CNAME  <frontend_subdomain>        → <frontend_app>.azurecontainerapps.io
#   CNAME  <backend_subdomain>         → <backend_app>.azurecontainerapps.io
#   TXT    asuid.<frontend_subdomain>  → <domain_verification_token>
#   TXT    asuid.<backend_subdomain>   → <domain_verification_token>
#
# Get verification tokens after initial deploy:
#   az containerapp show -n heimpath-frontend-<env> -g rg-heimpath-<env> --query "properties.customDomainVerificationId"

resource "azurerm_container_app_custom_domain" "frontend" {
  count = var.frontend_subdomain != "" ? 1 : 0

  name                                     = "${var.frontend_subdomain}.${var.domain}"
  container_app_id                         = azurerm_container_app.frontend.id
  container_app_environment_certificate_id = null # Uses managed certificate

  lifecycle {
    ignore_changes = [
      container_app_environment_certificate_id,
    ]
  }
}

resource "azurerm_container_app_custom_domain" "backend" {
  count = var.backend_subdomain != "" ? 1 : 0

  name                                     = "${var.backend_subdomain}.${var.domain}"
  container_app_id                         = azurerm_container_app.backend.id
  container_app_environment_certificate_id = null # Uses managed certificate

  lifecycle {
    ignore_changes = [
      container_app_environment_certificate_id,
    ]
  }
}
