# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATABASE_URL=postgresql://postgres:postgres@postgres:5432/movieshare?schema=public \
    BETTER_AUTH_URL=http://localhost:3000 \
    BETTER_AUTH_SECRET=change-this-to-a-random-32-char-secret \
    TMDB_API_TOKEN= \
    TMDB_API_KEY= \
    SEED_ADMIN_EMAIL=admin@movieshare.local \
    SEED_ADMIN_NAME="movieshare admin" \
    SMTP_HOST= \
    SMTP_PORT=587 \
    SMTP_USER= \
    SMTP_PASSWORD= \
    SMTP_FROM="movieshare <noreply@movieshare.local>" \
    STORAGE_ENDPOINT= \
    STORAGE_PUBLIC_BASE_URL= \
    STORAGE_BUCKET= \
    STORAGE_REGION=us-east-1 \
    STORAGE_ACCESS_KEY= \
    STORAGE_SECRET_KEY= \
    STORAGE_FORCE_PATH_STYLE=true \
    VIXSRC_BASE_URL= \
    VIXSRC_LANG=it \
    PLEX_WATCH_URL_TEMPLATE=

FROM base AS deps

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN --mount=type=cache,target=/root/.npm npm ci

FROM deps AS builder

ENV BUILD_STANDALONE=1

COPY . .

RUN npm run db:generate
RUN --mount=type=cache,target=/app/.next/cache npm run build

FROM base AS prisma-tools

RUN printf '%s\n' '{"name":"prisma-tools","private":true}' > package.json
RUN --mount=type=cache,target=/root/.npm npm install --no-save prisma@7.4.2

FROM base AS runner

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/scripts/container-start.mjs ./scripts/container-start.mjs
COPY --from=builder /app/scripts/promote-admin.mjs ./scripts/promote-admin.mjs
COPY --from=builder /app/package.json ./package.json
COPY --from=prisma-tools /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "scripts/container-start.mjs"]
