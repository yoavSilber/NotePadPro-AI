FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
# Install all deps (including devDeps) so tsc is available for compilation
RUN npm ci

COPY . .
# Compile TypeScript to dist/
RUN npx tsc --outDir dist

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
# Production deps only — no compiler overhead at runtime
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/server.js"]
