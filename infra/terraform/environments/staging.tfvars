environment = "staging"
location    = "germanywestcentral"

# Images (overridden by CI/CD)
backend_image  = "ghcr.io/sojisoyoye/heimpath/backend:latest"
frontend_image = "ghcr.io/sojisoyoye/heimpath/frontend:latest"

# Domain (set to "" to skip custom domain binding, configure DNS first)
frontend_subdomain = ""
backend_subdomain  = ""

# Scaling — scale to zero when idle
backend_min_replicas  = 0
backend_max_replicas  = 1
frontend_min_replicas = 0
frontend_max_replicas = 1

# Frontend URL for CORS
frontend_url = "https://staging.heimpath.com"
