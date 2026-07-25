# ── Stage 1: build React app ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install React app dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: install API dependencies ────────────────────────────────────────
FROM node:20-alpine AS api-deps

WORKDIR /api-build
COPY api/package.json ./
RUN npm install --omit=dev

# ── Stage 3: production image (Node serves API + static React dist) ───────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built React assets
COPY --from=builder /app/dist ./dist

# Copy seed data (initial jobs.json)
COPY data/ ./data/

# Copy API source + production node_modules
COPY api/server.js ./api/server.js
COPY --from=api-deps /api-build/node_modules ./api/node_modules

# Cloud Run injects PORT=8080; our server defaults to 3001 in dev
ENV NODE_ENV=production
EXPOSE 8080

# Run the Express server; it serves /api/* and the React SPA from /dist
CMD ["node", "api/server.js"]
