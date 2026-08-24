# syntax=docker/dockerfile:1.4

# --- deps ---
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# --mount=type=cache persists npm's download cache ACROSS builds (not just within one) — the first
# build is still slow, but every rebuild after that reuses already-downloaded packages instead of
# re-fetching them. npm ci (vs npm install) skips dependency-resolution work since it trusts the
# lockfile directly — faster and more deterministic for CI/production builds.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# --- builder ---
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma needs a DATABASE_URL to *generate* the client, but not to connect — a placeholder is fine
# here since `prisma generate` never opens a connection. Real value comes from .env at runtime.
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
RUN npx prisma generate
RUN npm run build

# --- runner ---
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000
CMD ["node", "server.js"]
