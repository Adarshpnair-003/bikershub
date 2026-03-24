# ── Stage 1: builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests and install ALL deps (including devDependencies)
COPY package*.json ./
RUN npm ci

# ── Stage 2: production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Create non-root user/group before switching context
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Install only production dependencies in the final image
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source (node_modules already installed above)
COPY --chown=appuser:appgroup . .

# Drop to non-root user
USER appuser

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Health-check: lightweight wget probe on the root path
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:5000/ || exit 1

CMD ["node", "server.js"]
