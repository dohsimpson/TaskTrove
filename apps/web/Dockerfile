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

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Use cache mount for Next.js cache
RUN --mount=type=cache,target=/app/.next/cache \
    corepack enable pnpm && pnpm run build

# use distroless image for security and image size
FROM gcr.io/distroless/nodejs22-debian12 AS runner
LABEL org.opencontainers.image.source=https://github.com/dohsimpson/TaskTrove

USER 1000:1000
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder --chown=1000:1000 /app/.next/standalone ./
COPY --from=builder --chown=1000:1000 /app/.next/static ./.next/static

EXPOSE 3000

CMD ["server.js"]
