# Build context is the repository root (see docker-compose.yml) so the workspace
# lockfile and shared tsconfig are available.
#
#   dev  -> nest start --watch, source bind-mounted by docker compose
#   prod -> slim runtime image with production dependencies only

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.23.0 --activate
WORKDIR /app

# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @nudge/server...

# ---------------------------------------------------------------------------
FROM deps AS dev
ENV NODE_ENV=development
COPY tsconfig.base.json ./
COPY server ./server
WORKDIR /app/server
EXPOSE 3000
CMD ["pnpm", "start:dev"]

# ---------------------------------------------------------------------------
FROM deps AS build
COPY tsconfig.base.json ./
COPY server ./server
RUN pnpm --filter @nudge/server build \
 && pnpm --filter @nudge/server deploy --prod --legacy /out

# ---------------------------------------------------------------------------
FROM node:22-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
COPY --from=build /app/server/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
