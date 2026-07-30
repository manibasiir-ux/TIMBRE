# syntax=docker/dockerfile:1

# TIMBRE — container image.
#
# Targets:
#   base   shared foundation
#   deps   reproducible dependency layer, cached on the lockfile
#   dev    hot-reloading development server (default for local work)
#   build  production compile, used to verify the build in CI parity
#   prod   production server, for local production-parity checks
#
# The dev target deliberately carries no application source and no node_modules.
# Locally the source arrives through a bind mount and dependencies live in a
# named volume, so this image stays tiny and is never invalidated by a
# dependency change. The deps layer exists for build/prod, where reproducibility
# matters more than iteration speed.

########################################
FROM node:22-bookworm-slim AS base
########################################
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app


########################################
FROM base AS deps
########################################
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund


########################################
FROM base AS dev
########################################
# NODE_ENV is deliberately not set here. The Next CLI derives it per command,
# and pinning it to development leaks into `next build`, where it makes the
# prerender of /_global-error fail with a null React dispatcher. This image
# serves both the dev server and the one-shot task runner, so it has to stay
# neutral.
#
# Bind mounts from Windows into the WSL2 VM do not propagate inotify events,
# so the file watcher has to poll or hot reload silently never fires.
ENV WATCHPACK_POLLING=true \
    CHOKIDAR_USEPOLLING=true \
    HOSTNAME=0.0.0.0 \
    PORT=3000
EXPOSE 3000
CMD ["npm", "run", "dev"]


########################################
FROM base AS build
########################################
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build


########################################
FROM base AS prod
########################################
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
