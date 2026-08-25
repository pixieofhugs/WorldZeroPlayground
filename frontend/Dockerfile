# Build the SPA, then throw the toolchain away and serve the output.
#
# VITE_API_URL is baked in at build time — Vite inlines `import.meta.env.*` into
# the bundle, so it cannot be an env var on the running container. dev and prod
# are therefore genuinely different images, tagged separately by the workflow.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
