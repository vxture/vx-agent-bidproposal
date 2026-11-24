# syntax=docker/dockerfile:1.7
# Multi-stage build for the Next.js standalone app in a pnpm workspace.
# Build context = repo root (so the workspace and lockfile are visible).
# Produces the single owned image bidproposal-app.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable

# --- deps + build ---
FROM base AS builder
WORKDIR /repo
COPY . .
# The GitHub Packages token (for @vxture/*, e.g. @vxture/shared - TD-001) rides
# a BuildKit secret, read via .npmrc's ${NODE_AUTH_TOKEN} - never a build-arg,
# never baked into a layer. Required: the app depends on @vxture/shared.
ARG VXTURE_NPM_REGISTRY
RUN --mount=type=secret,id=node_auth_token \
    --mount=type=cache,id=pnpm,target=/pnpm/store \
    NODE_AUTH_TOKEN="$(cat /run/secrets/node_auth_token 2>/dev/null || true)" \
    pnpm install --frozen-lockfile
RUN pnpm --filter @bidproposal/app build

# --- runner (Next standalone, non-root, never migrates) ---
FROM base AS runner
WORKDIR /app
# Build provenance (025 section 4.1): honest ARG defaults so an un-injected build
# still reports truthfully (dev/unknown), never a fabricated version. Read at
# RUNTIME by the liveness route - server-side env, NOT NEXT_PUBLIC (stays out of
# the client bundle). HOSTNAME=0.0.0.0 keeps loopback healthchecks reachable
# (020 section 3: Next standalone otherwise binds the container ID only).
#
# PORT/EXPOSE are bidproposal's allocated number, not a generic 3000. One number: the
# app listens on, is published on, and is proxied to the same port, so there is
# no mapping anywhere that can be right in one place and stale in another. The
# allocation comes from the org port registry, which is the only source allowed
# to assign one; compose overrides PORT at runtime from the deploy host's env,
# and this default is what a bare `docker run` gets.
ARG APP_VERSION=dev
ARG GIT_SHA=unknown
ARG BUILD_TIME=unknown
ARG DEPLOY_STAGE=dev
ENV NODE_ENV=production PORT=4070 HOSTNAME=0.0.0.0 \
    APP_VERSION=${APP_VERSION} \
    GIT_SHA=${GIT_SHA} \
    BUILD_TIME=${BUILD_TIME} \
    DEPLOY_STAGE=${DEPLOY_STAGE}
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    fonts-crosextra-carlito fonts-noto-cjk libreoffice-writer \
    python3 python3-lxml python3-uno python3-venv wget \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder /repo/portals/app/node_modules/@vxture/ruyin-node-runtime/dist/requirements.lock /tmp/bid-reader-requirements.lock
RUN python3 -m venv /opt/bid-reader \
    && /opt/bid-reader/bin/pip install --no-cache-dir --require-hashes \
    -r /tmp/bid-reader-requirements.lock
ENV BID_READER_PYTHON=/opt/bid-reader/bin/python
COPY --from=builder /repo/portals/app/.next/standalone ./
COPY --from=builder /repo/portals/app/.next/static ./portals/app/.next/static
COPY --from=builder /repo/portals/app/public ./portals/app/public
COPY --from=builder /repo/portals/app/document-engine ./portals/app/document-engine
USER nextjs
EXPOSE 4070
CMD ["node", "portals/app/server.js"]
