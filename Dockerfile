# ---- Base builder ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Install system deps (openssl for Prisma)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* .npmrc* ./

# Copy prisma folder
COPY prisma ./prisma

# Install dependencies
RUN npm ci --no-audit --no-fund


# ---- Build ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy sources
COPY . .

# Build time env (skip strict env validation during Docker build)
ENV SKIP_ENV_VALIDATION=1

# Install system deps (openssl for Prisma at build time)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Accept env needed at build time for prerendered pages
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}

# Generate Prisma client and build Next.js
RUN npx prisma generate
RUN npm run build

# ---- Runtime ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create a non-root user
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/* && useradd -m nextjs

# Copy required files
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts/docker-entrypoint.sh /app/scripts/docker-entrypoint.sh

# Ensure entrypoint is executable
RUN chmod +x /app/scripts/docker-entrypoint.sh && chown -R nextjs:nextjs /app

USER nextjs
EXPOSE 3000

# Start: run Prisma migrate deploy then Next.js
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
