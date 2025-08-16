# Use build platform for base images to avoid emulation
FROM --platform=$BUILDPLATFORM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Use cache mounts for pnpm cache
COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    corepack enable pnpm && pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Use cache mount for Next.js cache
RUN --mount=type=cache,target=/app/.next/cache \
    corepack enable pnpm && pnpm run build

# Production image - use target platform
FROM node:22-alpine AS runner
WORKDIR /app

# Add ghcr.io label for repo association
LABEL org.opencontainers.image.source=https://github.com/dohsimpson/TaskTrove

ENV NODE_ENV=production
COPY --from=builder /app/public ./public

RUN mkdir .next && chown 1000:1000 .next
RUN mkdir -p data && chown 1000:1000 data

COPY --from=builder --chown=1000:1000 /app/.next/standalone ./
COPY --from=builder --chown=1000:1000 /app/.next/static ./.next/static

USER 1000:1000
EXPOSE 3000
ENV PORT=3000

CMD ["sh", "-c", "HOSTNAME=0.0.0.0 node server.js"]