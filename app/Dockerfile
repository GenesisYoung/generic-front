# syntax=docker/dockerfile:1
# ---- build ---------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Same origin as the page: nginx forwards /api and /ws to the backend.
ARG VITE_BASE_URL=/api
ARG VITE_MESSAGE_URL=/ws
ARG VITE_APP_DEV_MODE=false
ENV VITE_BASE_URL=$VITE_BASE_URL \
    VITE_MESSAGE_URL=$VITE_MESSAGE_URL \
    VITE_APP_DEV_MODE=$VITE_APP_DEV_MODE
RUN npm run build-only

# ---- runtime -------------------------------------------------------------
FROM nginx:1.27-alpine
ENV BACKEND_UPSTREAM=backend:8080
# nginx's entrypoint fills ${BACKEND_UPSTREAM} into the template at start.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
