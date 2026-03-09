# movieshare

movieshare is a self-hosted collaborative movie list workspace built as a modular monolith on top of Next.js App Router.

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
- notifications inbox page
- list invite flow with shareable acceptance links
- friend invite flow for existing movieshare users
- TMDB search and metadata caching
- SMTP-backed email delivery for list and friend invites
- manual playback checkpoint saving and resume-point updates
- abstract streaming provider registry
- realtime-ready event broker interface
- install prompt and offline fallback baseline for PWA-style usage
- project vision, development notes and session handbook in `docs/`

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
- the watch-session domain and admin UI are ready, but you should replace the provider adapter with a compliant deployment-specific streaming implementation for real deployments

## Watch session note

Watch sessions in movieshare are currently tracking-first:

- they record who started a movie
- they record which members joined the same session
- they store checkpoints and resume positions

They do not currently provide synced tele-sharing or realtime group playback control.

## Realtime note

Realtime sync is partially implemented:

- a self-hosted SSE broker now powers live refresh for list, selection, movie-detail and watch-session views
- watch session membership and presence state are persisted
- playback checkpoints and activity logs already emit realtime events
- a notifications inbox now surfaces invites, live sessions and recent shared activity
- invite and social flows are still persistence-first and can later emit richer notifications

What is still missing:

- push-style in-app notifications
- presence badges without a full page refresh
- collaborative playback controls and heartbeats beyond manual checkpoints
- per-notification read state and delivery preferences

## PWA note

movieshare now includes a first installable PWA baseline:

- manifest and app icon metadata
- service worker registration in production builds
- install prompt when the browser exposes `beforeinstallprompt`
- offline fallback page for navigation failures

What is still missing:

- richer asset caching strategy
- background sync or push delivery
- deeper offline support for authenticated collaborative flows

## Admin settings

The admin console at `/admin` currently lets you manage:

- TMDB credentials and default language
- SMTP host, credentials and sender
- streaming provider activation and selection

Runtime behavior:

- database values entered from the admin panel take precedence
- if a field is empty in the admin panel, movieshare falls back to environment variables when available

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

Recommended local runtime:

- Node.js 22.x (matches the Docker image and avoids local Prisma runtime mismatches)

1. Install dependencies:

```bash
npm install
```

2. Create your env file:

```bash
npm run setup
```

3. Generate Prisma client:

```bash
npm run db:generate
```

4. Start PostgreSQL locally or use Docker Compose:

```bash
docker compose up -d postgres
```

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
npm run setup
docker compose up --build
```

The compose setup will:

- start PostgreSQL
- build the Next.js app image
- wait for the database to become reachable
- run `prisma db push`
- seed the default streaming provider config
- start the app on `http://localhost:3000`
- expose a container healthcheck once the app is actually serving traffic

## Registry-first production deploy

You do not need to build from source on the production host.

This repository now includes:

- `.github/workflows/publish-image.yml` to publish prebuilt images from GitHub Actions
- `docker-compose.registry.yml` to deploy from a prebuilt image
- `.env.production.example` as the production env baseline

Publishing behavior:

- automatic publish only on semver tags like `v1.2.3`
- manual publish through GitHub Actions `workflow_dispatch`
- no automatic push for normal development builds

Recommended default registry:

- use GitHub Container Registry (`ghcr.io`) if the repository already lives on GitHub

Optional secondary registry:

- Docker Hub can also be used by setting `DOCKERHUB_NAMESPACE`, `DOCKERHUB_USERNAME`, and `DOCKERHUB_TOKEN` in GitHub

Production deploy from a published image:

```bash
cp .env.production.example .env.production
docker compose --env-file .env.production -f docker-compose.registry.yml pull
docker compose --env-file .env.production -f docker-compose.registry.yml up -d
```

Detailed notes:

- see [docs/container-registry.md](./docs/container-registry.md)

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

This command is designed to run inside the production-style app container and does not
depend on `tsx` or other dev-only tooling.

## Useful commands

```bash
npm run setup
npm run dev
npm run test
npm run test:coverage
npm run lint
npm run typecheck
npm run build
npm run db:generate
npm run db:push
npm run db:seed
npm run user:promote-admin -- you@example.com
```

## Production notes

- use `Node.js 22.x`
- set a strong `BETTER_AUTH_SECRET` and keep the default placeholder out of production
- use an `https://` `BETTER_AUTH_URL` outside localhost
- prefer deploying from a tagged registry image on production hosts instead of rebuilding from source
- keep placeholder streaming adapters disabled until a compliant provider is implemented
- prefer SMTP and TMDB credentials from the admin panel only after securing the initial admin account

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

- see [docs/project-vision.md](./docs/project-vision.md)
- see [docs/development-plan.md](./docs/development-plan.md)
- see [docs/session-handbook.md](./docs/session-handbook.md)

Current TODOs are intentionally concentrated around:

- richer selection heuristics
- in-app notifications center and delivery preferences
- full PWA polish and installable app experience
- full responsive hardening across mobile, tablet and desktop
- presence indicators without full page refresh
- production-ready streaming provider integration
