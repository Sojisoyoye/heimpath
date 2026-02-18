environment = "prod"
location    = "germanywestcentral"

# Images (overridden by CI/CD)
backend_image  = "ghcr.io/sojisoyoye/heimpath/backend:latest"
frontend_image = "ghcr.io/sojisoyoye/heimpath/frontend:latest"

# Domain
frontend_subdomain = "www"
backend_subdomain  = "api"

# Scaling — always on for production
backend_min_replicas  = 1
backend_max_replicas  = 2
frontend_min_replicas = 1
frontend_max_replicas = 2

# Frontend URL for CORS
frontend_url = "https://www.heimpath.com"
