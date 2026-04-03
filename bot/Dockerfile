# ── Build stage ───────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY bot/package.json bot/package-lock.json ./
RUN npm ci

COPY bot/tsconfig.json ./
COPY bot/src ./src

RUN npx tsc

# ── Runtime stage ─────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY bot/package.json bot/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3002

EXPOSE 3002

CMD ["node", "dist/index.js"]
