variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "environment" {
  description = "Environment name (staging or prod)"
  type        = string
  validation {
    condition     = contains(["staging", "prod"], var.environment)
    error_message = "Environment must be 'staging' or 'prod'."
  }
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "germanywestcentral"
}

# Container images
variable "backend_image" {
  description = "Backend container image (GHCR)"
  type        = string
  default     = "ghcr.io/sojisoyoye/heimpath/backend:latest"
}

variable "frontend_image" {
  description = "Frontend container image (GHCR)"
  type        = string
  default     = "ghcr.io/sojisoyoye/heimpath/frontend:latest"
}

# GHCR credentials
variable "ghcr_username" {
  description = "GitHub Container Registry username"
  type        = string
}

variable "ghcr_password" {
  description = "GitHub Container Registry PAT or GITHUB_TOKEN"
  type        = string
  sensitive   = true
}

# Backend environment — PostgreSQL (individual fields for Pydantic Settings)
variable "postgres_server" {
  description = "PostgreSQL host (e.g., ep-xxx.germanywestcentral.azure.neon.tech)"
  type        = string
}

variable "postgres_port" {
  description = "PostgreSQL port"
  type        = number
  default     = 5432
}

variable "postgres_user" {
  description = "PostgreSQL user"
  type        = string
}

variable "postgres_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
}

variable "postgres_db" {
  description = "PostgreSQL database name"
  type        = string
  default     = "neondb"
}

variable "project_name" {
  description = "Project name for the app"
  type        = string
  default     = "HeimPath"
}

variable "secret_key" {
  description = "Application secret key"
  type        = string
  sensitive   = true
}

variable "first_superuser" {
  description = "First superuser email"
  type        = string
}

variable "first_superuser_password" {
  description = "First superuser password"
  type        = string
  sensitive   = true
}

variable "sentry_dsn" {
  description = "Sentry DSN for backend"
  type        = string
  default     = ""
}

variable "frontend_sentry_dsn" {
  description = "Sentry DSN for frontend"
  type        = string
  default     = ""
}

# Domain
variable "domain" {
  description = "Custom domain (e.g., heimpath.com)"
  type        = string
  default     = "heimpath.com"
}

variable "frontend_subdomain" {
  description = "Frontend subdomain (www for prod, staging for staging)"
  type        = string
}

variable "backend_subdomain" {
  description = "Backend subdomain (api for prod, api.staging for staging)"
  type        = string
}

# Scaling
variable "backend_min_replicas" {
  description = "Minimum backend replicas"
  type        = number
  default     = 0
}

variable "backend_max_replicas" {
  description = "Maximum backend replicas"
  type        = number
  default     = 1
}

variable "frontend_min_replicas" {
  description = "Minimum frontend replicas"
  type        = number
  default     = 0
}

variable "frontend_max_replicas" {
  description = "Maximum frontend replicas"
  type        = number
  default     = 1
}

# CORS
variable "frontend_url" {
  description = "Frontend URL for CORS (e.g., https://www.heimpath.com)"
  type        = string
}

# SMTP (optional)
variable "smtp_host" {
  description = "SMTP host"
  type        = string
  default     = ""
}

variable "smtp_user" {
  description = "SMTP user"
  type        = string
  default     = ""
}

variable "smtp_password" {
  description = "SMTP password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "emails_from_email" {
  description = "Sender email address"
  type        = string
  default     = ""
}
