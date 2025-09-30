# syntax = docker/dockerfile:1

# Adjust BUN_VERSION as desired
ARG BUN_VERSION=1.1.29
FROM oven/bun:${BUN_VERSION}-slim AS base

LABEL fly_launch_runtime="Bun/Prisma"

# Bun/Prisma app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed for deployment
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Install dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Generate Prisma Client
COPY prisma ./prisma/
RUN bunx prisma generate

# Copy application code
COPY . .

# Build application
RUN bun run build


# Final stage for app image
FROM base

# Install packages needed for deployment
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Use existing bun user and create nodejs group
RUN addgroup --system --gid 1001 nodejs || true && \
    usermod -a -G nodejs bun 2>/dev/null || true

# Copy built application
COPY --from=build /app /app

# Create data directory and set permissions for mounted volume
RUN mkdir -p /data && \
    chown -R bun:bun /app /data && \
    chmod -R 755 /data

# Switch to non-root user
USER bun

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "bun", "run", "src/index.ts" ]
