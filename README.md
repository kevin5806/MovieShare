# movielist

movielist is a self-hosted collaborative movie list workspace built as a modular monolith on top of Next.js App Router.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma 7
- PostgreSQL
- Better Auth
- Docker Compose

## What is included

- landing page
- login and registration
- authenticated dashboard
- collaborative list page
- movie detail page inside a list
- movie selection page
- watch session page
- system admin page for streaming providers
- system admin panel for TMDB, email and streaming configuration
- user profile page
- list invite flow with shareable acceptance links
- friend invite flow for existing movielist users
- TMDB search and metadata caching
- SMTP-backed email delivery for list and friend invites
- manual playback checkpoint saving and resume-point updates
- abstract streaming provider registry
- realtime-ready event broker interface
- project vision and development notes in `docs/`

## Architecture

This project stays inside one Next.js app and separates concerns by module:

- `app/`: routes, layouts, route handlers
- `components/`: UI and interaction components
- `features/`: schemas and server actions grouped by feature
- `server/`: auth, database, services, integrations, realtime contracts
- `prisma/`: schema and migrations
- `docs/`: product vision and development plan

Important boundaries:

- UI lives in `components/`
- auth and session helpers live in `server/auth.ts` and `server/session.ts`
- TMDB access is isolated in `server/services/tmdb-service.ts`
- streaming provider logic lives under `server/services/streaming/`
- system runtime settings live in `server/services/system-config.ts`
- Prisma is the single persistence boundary

## Streaming provider note

The repository already includes:

- a `StreamingProvider` abstraction
- persisted provider configuration in Prisma
- an admin page for enable/disable and active-provider selection
- an initial `vixsrc` provider slot

Current implementation detail:

- the `vixsrc` adapter is intentionally scaffolded as unavailable and does not return a working playback URL
- the watch-session domain and admin UI are ready, but you should replace the provider adapter with a compliant streaming implementation for real deployments

## Realtime note

Realtime sync is not fully implemented yet, but the codebase already contains:

- watch session membership and presence state
- playback checkpoints
- activity logs
- a broker contract in `server/realtime/broker.ts`
- invite and social flows that can later emit realtime notifications

This keeps the domain ready for future WebSocket or SSE integration.

## Admin settings

The admin console at `/admin` currently lets you manage:

- TMDB credentials and default language
- SMTP host, credentials and sender
- streaming provider activation and selection

Runtime behavior:

- database values entered from the admin panel take precedence
- if a field is empty in the admin panel, movielist falls back to environment variables when available

## Environment

Use `.env.example` as the baseline.

Required variables:

- `DATABASE_URL`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`

Optional but recommended:

- `TMDB_API_TOKEN`
- `TMDB_API_KEY`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_NAME`
- `SMTP_*`

TMDB auth note:

- prefer `TMDB_API_TOKEN` (API Read Access Token)
- `TMDB_API_KEY` is also supported as a fallback
- if both are set, `TMDB_API_TOKEN` wins

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create your env file:

```bash
cp .env.example .env
```

3. Generate Prisma client:

```bash
npm run db:generate
```

4. Start Postgres locally or use Docker Compose.

5. Push schema and seed defaults:

```bash
npm run db:push
npm run db:seed
```

6. Start the app:

```bash
npm run dev
```

## Docker Compose

Start the full stack with:

```bash
docker compose up --build
```

The compose setup will:

- start PostgreSQL
- build the Next.js app image
- run `prisma db push`
- seed the default streaming provider config
- start the app on `http://localhost:3000`

## First admin user

1. Register normally from the UI.
2. Promote the user to admin:

```bash
npm run user:promote-admin -- you@example.com
```

With Docker:

```bash
docker compose exec app npm run user:promote-admin -- you@example.com
```

## Useful commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run db:generate
npm run db:push
npm run db:seed
npm run user:promote-admin -- you@example.com
```

## Data model highlights

The Prisma schema currently covers:

- `User`, `Profile`
- `FriendshipInvite`, `Friendship`
- `MovieList`, `MovieListMember`, `MovieListInvite`
- `Movie`, `MovieListItem`, `MovieFeedback`
- `SelectionRun`, `SelectionResult`
- `WatchSession`, `WatchSessionMember`, `PlaybackCheckpoint`
- `StreamingProviderConfig`
- `ActivityLog`
- Better Auth tables: `Session`, `Account`, `Verification`

## Notes for future work

- see [docs/project-vision.md](/c:/GitHub/FilmShare/docs/project-vision.md)
- see [docs/development-plan.md](/c:/GitHub/FilmShare/docs/development-plan.md)

Current TODOs are intentionally concentrated around:

- realtime transport
- richer selection heuristics
- in-app notifications center and delivery preferences
- production-ready streaming provider integration
