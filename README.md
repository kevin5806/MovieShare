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
- MinIO object storage
- Nginx media CDN layer
- React Email
- Web Push
- Playwright + axe-core

## What is included

- landing page
- branded app metadata surface with generated icons, social previews and custom route fallbacks
- single progressive access flow for login and registration
- authenticated dashboard
- collaborative list page
- movie detail page inside a list
- movie selection page
- watch session page
- system admin page for streaming providers
- system admin panel for TMDB, email and streaming configuration
- admin roadmap for future access methods
- user profile page
- notifications inbox page
- persistent notification read state with bulk/single mark-as-read actions
- manager roles for collaborative list operations
- dedicated list settings page for presentation, invites, member permissions and deletion
- list invite flow with app-user, email-bound and public-link access paths
- invite management with revoke/copy and target-role assignment
- friend invite flow for existing movieshare users
- movie removal flow for proposers and list managers
- persisted per-user list ordering and proposer filters
- TMDB search and metadata caching
- mirrored TMDB movie artwork served through the local media CDN when storage is configured
- React Email-backed email delivery for list invites, friend invites, sign-in codes and magic links
- admin notification defaults with per-user overrides
- browser push subscription management and web push delivery
- per-user movie progress tracking, grouped room progress propagation, manual checkpoints and resume-point updates
- abstract streaming provider registry
- realtime-ready event broker interface
- install prompt and offline fallback baseline for PWA-style usage
- self-hosted media storage and public image delivery for avatars and list covers
- Playwright smoke/a11y test baseline for UI regressions
- project vision, development notes and session handbook in `docs/`
- integration playbook and streaming-provider guide in `docs/`
- public-surface guide for metadata, icons, social previews and branded error states in `docs/`

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
- configurable `vixsrc` and `plex` provider slots

Current implementation detail:

- streaming provider support remains deployment-specific
- if a custom provider integration already exists in your deployment, keep it under `server/services/streaming/` and improve it there without coupling the rest of the product to one source
- movie posters and backdrops can be mirrored into the built-in media storage layer so list/detail pages stop depending on TMDB image delivery at runtime

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
- a notifications inbox now surfaces invites, live sessions and recent shared activity with persistent read state
- notification defaults and per-user overrides now cover in-app, email and push channels
- web push delivery is available when VAPID is configured and the device is subscribed

What is still missing:

- presence badges without a full page refresh
- collaborative playback controls and richer fan-out beyond persisted checkpoints
- digests, batching and broader push automation beyond invite-first delivery

## PWA note

movieshare now includes a first installable PWA baseline:

- manifest and app icon metadata
- service worker registration in production builds
- install prompt when the browser exposes `beforeinstallprompt`
- offline fallback page for navigation failures
- service-worker-driven web push handling for notifications and deep links

What is still missing:

- richer asset caching strategy
- background sync and cache invalidation beyond the shell baseline
- deeper offline affordances for authenticated list/watch workflows

## Public surface polish

The app now includes a proper branded public shell instead of framework defaults:

- generated favicon/app icon and Apple icon routes
- Open Graph and Twitter preview images
- custom public and authenticated 404 states
- custom root error page
- `robots.txt` and `sitemap.xml`
- route-specific metadata for important public entry points such as login and public list invites

Implementation references:

- `app/layout.tsx`
- `app/icon.tsx`
- `app/apple-icon.tsx`
- `app/opengraph-image.tsx`
- `app/twitter-image.tsx`
- `app/not-found.tsx`
- `app/(app)/not-found.tsx`
- `app/error.tsx`
- `app/robots.ts`
- `app/sitemap.ts`
- `server/site-config.ts`

Contributor note:

- see [docs/public-surface.md](./docs/public-surface.md) before changing landing metadata, public previews, icons, or route-level error surfaces

## Admin settings

The admin console at `/admin` currently lets you manage:

- TMDB credentials and default language
- SMTP host, credentials and sender
- notification delivery defaults and the push master switch
- VAPID key management for push delivery
- rollout planning for future access methods such as email code, magic link, passkeys and 2FA
- media storage runtime visibility for avatar and list-cover uploads
- streaming provider activation and selection

Runtime behavior:

- database values entered from the admin panel take precedence
- if a field is empty in the admin panel, movieshare falls back to environment variables when available
- non-empty toggles and provider-slot booleans also support env bootstrap on first setup through
  `AUTH_*`, `STREAMING_*`, `TMDB_LANGUAGE`, `SMTP_PORT`, and `SMTP_SECURE`

## Environment

Use `.env.example` as the baseline.

Required variables:

- `DATABASE_URL`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`

Optional but recommended:

- `TMDB_API_TOKEN`
- `TMDB_API_KEY`
- `TMDB_LANGUAGE`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_NAME`
- `SMTP_*`
- `PUSH_NOTIFICATIONS_ENABLED`
- `VAPID_*`
- `AUTH_*`
- `MINIO_ROOT_*`
- `STORAGE_*`
- `VIXSRC_*`
- `PLEX_WATCH_URL_TEMPLATE`
- `STREAMING_*`

Media note:

- `STORAGE_*` is also what allows movieshare to mirror TMDB artwork into the local CDN-backed bucket for persisted movie entries

TMDB auth note:

- prefer `TMDB_API_TOKEN` (API Read Access Token)
- `TMDB_API_KEY` is also supported as a fallback
- if both are set, `TMDB_API_TOKEN` wins

Admin/runtime config note:

- TMDB token, API key and language can come from `.env` or `/admin`
- SMTP host, port, secure mode, credentials and sender can come from `.env` or `/admin`
- push delivery master state comes from `.env` or `/admin`, while VAPID keys stay in `.env`
- push delivery master state and VAPID keys can both come from `.env` or `/admin`, with database values taking precedence
- future access-method toggles can be bootstrapped from `.env` and then overridden in `/admin`
- streaming slot enablement and preferred provider can be bootstrapped from `.env` and then overridden in `/admin`

## Delivery email coverage

React Email is already used in production code for:

- list invite emails
- friend invite emails
- sign-in code emails
- magic link emails

Implementation references:

- `server/services/email-service.tsx`
- `server/email/templates/list-invite-email.tsx`
- `server/email/templates/friend-invite-email.tsx`
- `server/email/templates/auth-code-email.tsx`
- `server/email/templates/magic-link-email.tsx`

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

Optional UI test setup:

```bash
npx playwright install
npm run test:ui
```

This path uses Next.js dev mode and does not rebuild the production image on every change.

## Docker development without rebuilds

If you want Docker in development without rebuilding the production image every time, use the
dedicated dev service:

```bash
npm run dev:docker
```

Or detached:

```bash
npm run dev:docker:detach
```

What this does:

- reuses the existing `postgres` service
- runs a dedicated `app-dev` container on `node:22-alpine`
- mounts the source code into the container
- keeps `node_modules` and `.next` in named volumes
- runs Next.js in dev mode with hot reload
- skips full production builds for normal code edits
- exposes the dev app on `http://localhost:3001` by default to avoid clashing with the production-style app container

Useful dev commands:

```bash
npm run dev:db
npm run dev:docker
npm run dev:docker:detach
npm run dev:docker:down
```

Notes:

- `DEV_AUTO_DB_PUSH=1` is enabled by default in the dev container so Prisma schema changes get applied automatically on start
- set `DEV_AUTO_DB_PUSH=0` if you want manual control
- the production-style `docker compose up --build` flow is still available, but it is meant for runtime verification rather than normal iteration

## Docker Compose

Start the full stack with:

```bash
npm run setup
docker compose up --build
```

The compose setup will:

- start PostgreSQL
- start MinIO object storage
- initialize the public media bucket
- start the media-cdn layer for public image delivery
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
- manual publish now keeps `publish_latest=false` by default
- no automatic push for normal development builds
- production auto-updaters should track explicit version tags, not `latest`

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

Making the GHCR package public:

1. Open the `movieshare` container package in GitHub Packages.
2. Open `Package settings`.
3. In `Danger Zone`, change visibility to `Public`.
4. If visibility controls are unavailable because the package inherits repository permissions, remove inherited permissions first.

Installing the production package published by GitHub Actions:

1. Wait for `Publish container image` to finish for your release tag or manual run.
2. Copy `.env.production.example` to `.env.production`.
3. Set `MOVIESHARE_IMAGE=ghcr.io/<owner>/movieshare:<tag>`.
4. Fill the required production env values.
5. If the package is private, log in with a GitHub token that has `read:packages`.
6. Run:

```bash
docker compose --env-file .env.production -f docker-compose.registry.yml pull
docker compose --env-file .env.production -f docker-compose.registry.yml up -d
```

Detailed notes:

- keep `infra/nginx/media-cdn.conf` next to `docker-compose.registry.yml` in the deployment bundle
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
npm run dev:db
npm run dev:docker
npm run dev:docker:detach
npm run dev:docker:down
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
- keep deployment-specific streaming adapters disabled until their runtime config and review are complete
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
- `SystemNotificationPreference`, `UserNotificationPreference`, `PushSubscription`
- Better Auth tables: `Session`, `Account`, `Verification`

## Notes for future work

- see [docs/project-vision.md](./docs/project-vision.md)
- see [docs/development-plan.md](./docs/development-plan.md)
- see [docs/session-handbook.md](./docs/session-handbook.md)
- see [docs/public-surface.md](./docs/public-surface.md)
- see [docs/integration-playbook.md](./docs/integration-playbook.md)
- see [docs/streaming-provider-guide.md](./docs/streaming-provider-guide.md)

Current TODOs are intentionally concentrated around:

- richer selection heuristics
- full PWA polish and installable app experience
- full responsive hardening across mobile, tablet and desktop
- presence indicators without full page refresh
- stronger access-method rollout, richer push/digest automation and production-ready streaming/provider integration
