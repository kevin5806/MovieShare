FROM node:22-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=postgresql://postgres:postgres@postgres:5432/movielist?schema=public \
    BETTER_AUTH_URL=http://localhost:3000 \
    BETTER_AUTH_SECRET=change-this-to-a-random-32-char-secret \
    TMDB_API_TOKEN= \
    SEED_ADMIN_EMAIL=admin@movielist.local \
    SEED_ADMIN_NAME="MovieList Admin" \
    SMTP_HOST= \
    SMTP_PORT=587 \
    SMTP_USER= \
    SMTP_PASSWORD= \
    SMTP_FROM="MovieList <noreply@movielist.local>"

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
