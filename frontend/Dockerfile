# Build the SPA, then throw the toolchain away and serve the output.
#
# VITE_API_URL is baked in at build time — Vite inlines `import.meta.env.*` into
# the bundle (frontend/src/api/baseUrl.ts), so it cannot be an env var on the
# running container. dev and prod are therefore genuinely different images,
# built separately by .github/workflows/deploy.yml. The BACKEND image is the one
# promoted by digest; this one is rebuilt from the same commit.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# No default, and checked rather than defaulted: every real build passes this,
# and a wrong value is worse than a missing one. `baseUrl.ts` falls back with
# `??`, which does NOT treat '' as absent — so an unset ARG inlines an empty
# origin, every request becomes a same-origin relative path, Caddy's SPA
# fallback answers it with index.html, and the app fails as though the API
# returned HTML. Loudly at build time instead.
ARG VITE_API_URL
RUN test -n "$VITE_API_URL" \
    || (echo "VITE_API_URL build-arg is required (it is inlined into the bundle)." \
        && exit 1)
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
