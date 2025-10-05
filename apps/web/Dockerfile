# credit to: https://turborepo.com/docs/guides/tools/docker
FROM --platform=$BUILDPLATFORM node:22-alpine AS base
 
FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
# Set working directory
WORKDIR /app
COPY . .

RUN npm install -g turbo
 
# Generate a partial monorepo with a pruned lockfile for a target workspace.
# Assuming "web" is the name entered in the project's package.json: { name: "web" }
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    corepack enable pnpm && turbo prune web --docker
 
# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
 
# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    corepack enable pnpm && pnpm install --frozen-lockfile
 
# Build the project
COPY --from=builder /app/out/full/ .
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    corepack enable pnpm && pnpm build

# for backward compatibility and easier mounting, create a symlink to the data and backups directory
# symlink will be copied as long as they are inside a directory to be copied (copying symlink alone won't work)
# reference: https://github.com/moby/moby/issues/40449#issuecomment-1545819389
RUN ["ln", "-s", "/app/data", "/app/apps/web/.next/standalone/apps/web/data"]
RUN ["ln", "-s", "/app/backups", "/app/apps/web/.next/standalone/apps/web/backups"]


# using distroless image for extra security and smaller size: https://github.com/GoogleContainerTools/distroless
# image is architecture agnostic
FROM gcr.io/distroless/nodejs22-debian12 AS runner
WORKDIR /app
 
# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=installer --chown=1000:1000 /app/apps/web/.next/standalone ./
COPY --from=installer --chown=1000:1000 /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=1000:1000 /app/apps/web/public ./apps/web/public

WORKDIR /app/apps/web

CMD ["server.js"]
