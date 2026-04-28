#!/bin/sh
set -e

# Substitute ${BACKEND_HOST} in the nginx config template at container startup.
# Only ${BACKEND_HOST} is substituted — all other $var nginx variables are
# left intact.  BACKEND_HOST must be set as a container environment variable.
envsubst '${BACKEND_HOST}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
