# Stage 0, "build-stage", based on Bun, to build and compile the frontend
FROM oven/bun:1 AS build-stage

WORKDIR /app

COPY package.json bun.lock /app/

COPY frontend/package.json /app/frontend/

WORKDIR /app/frontend

RUN bun install

COPY ./frontend /app/frontend
ARG VITE_API_URL
ARG VITE_SENTRY_DSN

RUN bun run build


# Stage 1, based on Nginx, to have only the compiled app, ready for production with Nginx
FROM nginx:1

COPY --from=build-stage /app/frontend/dist/ /usr/share/nginx/html

# nginx.conf.template is processed at container startup by docker-entrypoint.sh,
# which substitutes ${BACKEND_HOST} so /api/ requests are proxied to the backend
# on the same origin — ensuring cookies set by the backend are visible to the
# frontend's document.cookie (required for isLoggedIn() checks).
COPY ./frontend/nginx.conf.template /etc/nginx/conf.d/default.conf.template
COPY ./frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

CMD ["/docker-entrypoint.sh"]
