terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  # State migrated from Azure blob storage to local.
  # Before running terraform apply to destroy Azure resources:
  #   1. Export Azure service principal credentials as ARM_* env vars
  #      (see infra/DEPLOYMENT.md § Azure Teardown for details)
  #   2. terraform init -migrate-state
  #   3. terraform apply   ← destroys all remaining Azure resources
  #   4. Delete this terraform/ directory once apply succeeds
  backend "local" {}
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}
