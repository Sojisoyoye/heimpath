terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-heimpath-tfstate"
    storage_account_name = "heimpathtfstate"
    container_name       = "tfstate"
    key                  = "heimpath.tfstate"
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}
