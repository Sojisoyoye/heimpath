#!/bin/sh
set -e

# BACKEND_HOST must be set as a container environment variable.
[ -z "$BACKEND_HOST" ] && echo "ERROR: BACKEND_HOST is required" >&2 && exit 1

# Substitute ${BACKEND_HOST} in the nginx config template at container startup.
# Only ${BACKEND_HOST} is substituted — all other $var nginx variables are
# left intact.
envsubst '${BACKEND_HOST}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
