# ──────────────────────────────────────────────
# Shared variables
# ──────────────────────────────────────────────

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "germanywestcentral"
}

variable "domain" {
  description = "Custom domain (e.g., heimpath.com)"
  type        = string
  default     = "heimpath.com"
}

variable "project_name" {
  description = "Project name for the app"
  type        = string
  default     = "HeimPath"
}

variable "ghcr_username" {
  description = "GitHub Container Registry username"
  type        = string
}

variable "ghcr_password" {
  description = "GitHub Container Registry PAT or GITHUB_TOKEN"
  type        = string
  sensitive   = true
}

# ──────────────────────────────────────────────
# Staging variables
# ──────────────────────────────────────────────

variable "staging_backend_image" {
  description = "Staging backend container image"
  type        = string
  default     = "ghcr.io/sojisoyoye/heimpath/backend:staging-latest"
}

variable "staging_frontend_image" {
  description = "Staging frontend container image"
  type        = string
  default     = "ghcr.io/sojisoyoye/heimpath/frontend:staging-latest"
}

variable "staging_postgres_server" {
  description = "Staging PostgreSQL host"
  type        = string
}

variable "staging_postgres_port" {
  description = "Staging PostgreSQL port"
  type        = number
  default     = 5432
}

variable "staging_postgres_user" {
  description = "Staging PostgreSQL user"
  type        = string
}

variable "staging_postgres_password" {
  description = "Staging PostgreSQL password"
  type        = string
  sensitive   = true
}

variable "staging_postgres_db" {
  description = "Staging PostgreSQL database name"
  type        = string
  default     = "neondb"
}

variable "staging_secret_key" {
  description = "Staging application secret key"
  type        = string
  sensitive   = true
}

variable "staging_first_superuser" {
  description = "Staging first superuser email"
  type        = string
}

variable "staging_first_superuser_password" {
  description = "Staging first superuser password"
  type        = string
  sensitive   = true
}

variable "staging_sentry_dsn" {
  description = "Staging Sentry DSN for backend"
  type        = string
  default     = ""
}

variable "staging_frontend_sentry_dsn" {
  description = "Staging Sentry DSN for frontend"
  type        = string
  default     = ""
}

variable "staging_frontend_subdomain" {
  description = "Staging frontend subdomain"
  type        = string
  default     = "staging"
}

variable "staging_backend_subdomain" {
  description = "Staging backend subdomain"
  type        = string
  default     = "api.staging"
}

variable "staging_frontend_url" {
  description = "Staging frontend URL for CORS"
  type        = string
  default     = "https://staging.heimpath.com"
}

variable "staging_backend_min_replicas" {
  description = "Staging minimum backend replicas"
  type        = number
  default     = 0
}

variable "staging_backend_max_replicas" {
  description = "Staging maximum backend replicas"
  type        = number
  default     = 1
}

variable "staging_frontend_min_replicas" {
  description = "Staging minimum frontend replicas"
  type        = number
  default     = 0
}

variable "staging_frontend_max_replicas" {
  description = "Staging maximum frontend replicas"
  type        = number
  default     = 1
}

variable "staging_smtp_host" {
  description = "Staging SMTP host"
  type        = string
  default     = ""
}

variable "staging_smtp_user" {
  description = "Staging SMTP user"
  type        = string
  default     = ""
}

variable "staging_smtp_password" {
  description = "Staging SMTP password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "staging_emails_from_email" {
  description = "Staging sender email address"
  type        = string
  default     = ""
}

# ──────────────────────────────────────────────
# Production variables
# ──────────────────────────────────────────────

variable "prod_backend_image" {
  description = "Production backend container image"
  type        = string
  default     = "ghcr.io/sojisoyoye/heimpath/backend:latest"
}

variable "prod_frontend_image" {
  description = "Production frontend container image"
  type        = string
  default     = "ghcr.io/sojisoyoye/heimpath/frontend:latest"
}

variable "prod_postgres_server" {
  description = "Production PostgreSQL host"
  type        = string
}

variable "prod_postgres_port" {
  description = "Production PostgreSQL port"
  type        = number
  default     = 5432
}

variable "prod_postgres_user" {
  description = "Production PostgreSQL user"
  type        = string
}

variable "prod_postgres_password" {
  description = "Production PostgreSQL password"
  type        = string
  sensitive   = true
}

variable "prod_postgres_db" {
  description = "Production PostgreSQL database name"
  type        = string
  default     = "neondb"
}

variable "prod_secret_key" {
  description = "Production application secret key"
  type        = string
  sensitive   = true
}

variable "prod_first_superuser" {
  description = "Production first superuser email"
  type        = string
}

variable "prod_first_superuser_password" {
  description = "Production first superuser password"
  type        = string
  sensitive   = true
}

variable "prod_sentry_dsn" {
  description = "Production Sentry DSN for backend"
  type        = string
  default     = ""
}

variable "prod_frontend_sentry_dsn" {
  description = "Production Sentry DSN for frontend"
  type        = string
  default     = ""
}

variable "prod_frontend_subdomain" {
  description = "Production frontend subdomain"
  type        = string
  default     = "www"
}

variable "prod_backend_subdomain" {
  description = "Production backend subdomain"
  type        = string
  default     = "api"
}

variable "prod_frontend_url" {
  description = "Production frontend URL for CORS"
  type        = string
  default     = "https://www.heimpath.com"
}

variable "prod_backend_min_replicas" {
  description = "Production minimum backend replicas"
  type        = number
  default     = 1
}

variable "prod_backend_max_replicas" {
  description = "Production maximum backend replicas"
  type        = number
  default     = 2
}

variable "prod_frontend_min_replicas" {
  description = "Production minimum frontend replicas"
  type        = number
  default     = 1
}

variable "prod_frontend_max_replicas" {
  description = "Production maximum frontend replicas"
  type        = number
  default     = 2
}

variable "prod_smtp_host" {
  description = "Production SMTP host"
  type        = string
  default     = ""
}

variable "prod_smtp_user" {
  description = "Production SMTP user"
  type        = string
  default     = ""
}

variable "prod_smtp_password" {
  description = "Production SMTP password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "prod_emails_from_email" {
  description = "Production sender email address"
  type        = string
  default     = ""
}
