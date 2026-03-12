# Session Handbook

Last updated: March 12, 2026

## How to use this file

- Read this file at the beginning of each non-trivial session.
- Update it after significant implementation, security, UX, architecture, or deployment changes.
- Treat it as the durable handoff between sessions.

## Current objectives

- keep `movieshare` as a modular monolith with clear boundaries between `app`, `components`, `features`, and `server`
- keep the UI moving toward reusable primitives instead of page-specific logic
- continue Phase 4 hardening: responsive cleanup, stronger presence/notifications, and better PWA polish
- keep the new role/invite/notification layers coherent across admin, profile, and list pages
- keep installation and first-run experience simple on fresh machines
- keep production schema changes migration-backed so published images boot cleanly on existing databases
- keep the new media storage stack stable so profile/list imagery stays easy to operate
- improve production readiness without making unsupported compliance or deployment claims about streaming integrations
- keep admin configuration controls working end-to-end, especially toggle-based forms
- keep the new access-method rollout honest in copy and behavior: live methods should work end-to-end, blocked ones should say why

## Current state snapshot

- authentication now uses a single access flow on `/login`, with `/register` kept as a compatibility redirect
- the access flow is now progressive: users start from one form and only see onboarding fields if the email is new
- email code, magic link and passkey access are now wired through Better Auth and exposed from the same login surface when enabled by admin/runtime state
- profile security settings now let users manage passkeys and authenticator-based two-factor protection when the deployment and account are eligible
- profile now also exposes active session management and recent access history, so users can review browser/device activity and sign out other devices without leaving the account area
- the profile page and security section are stable again after hydration-safe push subscription handling, so passkey listing and two-factor controls render correctly in the shipped UI
- magic-link verification now uses a Prisma-compatible `Verification.identifier` unique key, so opening a valid sign-in link no longer fails with the Better Auth adapter lookup error seen earlier
- realtime live refresh exists through the self-hosted SSE route and broker
- watch playback pages can now ingest iframe `PLAYER_EVENT` messages and persist automatic progress updates without forcing a full-page refresh
- the watch embed listener is now tolerant of numeric-string payloads and deployment-specific iframe origins, and movie posters are being normalized toward full-bleed cover frames
- collaborative lists now support `OWNER`, `MANAGER`, and `MEMBER` roles, owner-side member moderation, and movie removal by proposer or manager
- list owners can now delete a list from the list detail page
- list presentation, invites, member management and deletion now live on a dedicated `/lists/[slug]/settings` page, while the main list page stays focused on the titles
- each member now has persisted list view preferences for ordering and proposer filters, so the chosen organization state survives future visits
- list invites now support app-user delivery, email-bound links, and reusable public links with optional target role and usage limits
- React Email now drives invite delivery plus auth emails such as sign-in codes and magic links, while notification defaults and per-user overrides cover in-app, email, and push channels
- device push subscriptions can now be managed from the profile when VAPID is configured and push is enabled by admin, and VAPID keys themselves can now be configured with the same `DB -> env` priority model as other admin-managed integrations
- watch progress is now modeled per user and per list item, with grouped playback events updating every joined member in that room so catch-up scenarios and partial group watches can be represented cleanly over time
- movie detail and watch pages now expose per-person progress, started/finished summaries and recent watch history to make the tracking model visible without pretending the app is doing synced teleparty playback
- a Playwright plus axe-core smoke harness now exists for UI/client-side regression coverage
- the Playwright suite now covers admin, auth, collaboration, lists/watch, profile/notifications, offline and client-error monitoring end-to-end against the Dockerized app
- Playwright coverage is now aligned with the current copy and flows, and the watch spec explicitly ignores known third-party iframe console noise from the active embed provider so app regressions remain visible without failing on external CORS chatter
- release validation now stays aligned with `eslint@9.39.4`; allowing the root dependency to float to ESLint 10 breaks `eslint-config-next` in a clean `npm ci` environment even when an already-installed local workspace still appears green
- the Docker-based CI validation script now injects localhost-safe Better Auth placeholders so `next build` can validate a clean checkout without depending on an untracked `.env`
- `npm run typecheck` now goes through `scripts/typecheck.mjs` because Next 16 typegen is intermittently leaving missing `.next/types` stub files on this project
- the app shell now exposes working notification and account actions instead of dead navbar controls
- the sidebar now exposes dedicated sections and direct menus for dashboard, lists, watch sessions, notifications, profile, and admin
- the dashboard is now status-first and no longer embeds list creation directly; new lists should be created from the dedicated `/lists` area so the overview stays compact
- the notifications inbox now has persistent read state, filterable feed actions, and shell badge counts driven by unread items
- a first PWA baseline exists with manifest, service worker registration, install prompt, icon and offline page
- branded app polish now includes generated app icons, apple icon, Open Graph/Twitter preview images, custom 404/error surfaces, and basic `robots.txt` plus `sitemap.xml` routes
- registry-first deployment is now supported through prebuilt images, GitHub Actions publishing, and a source-free production compose file
- production container boot now uses Prisma migrations instead of `db push`, and legacy installs are repaired against the live Prisma schema before migrations continue, even if an older image already wrote `_prisma_migrations` too early
- candidate/release Docker builds and the Dockerized PR validation path now run with `CONTAINER_BUILD=1` and a capped Node heap so the self-hosted runner can finish `next build` without redoing type validation that the explicit `typecheck` step already enforced
- deployment docs now explain how to make the GHCR package public and how to install the published production image on a target host
- deployment docs now also call out the Portainer/Linux bind-mount caveat for `infra/nginx/media-cdn.conf` so image-based deploys do not fail on missing host files
- deployment notes now also call out that `minio-init` should wait on `mc ready`, not only `mc alias set`, to avoid early bucket-bootstrap failures on Linux/Portainer stacks
- a persisted light/dark theme preference now exists, with account-menu toggling and dark-safe shell/background gradients
- Docker development now has a separate hot-reload path that avoids production rebuilds for normal iteration
- MinIO-backed media storage plus the `media-cdn` service now power profile avatars and list-cover images
- persisted movie posters and backdrops can now be mirrored into the same media storage/CDN layer instead of always loading from TMDB at runtime
- the admin panel now tracks future auth-method rollout intent and prerequisites
- the admin panel now exposes multiple configurable streaming slots, including `vixsrc` and `plex`
- admin-configurable TMDB, SMTP, access-method planning, and streaming-slot state now all have an env/bootstrap path in addition to the admin panel
- reusable form/time primitives exist and should be extended before creating new UI variants
- Docker runtime has been optimized with a much smaller multi-stage image and a working startup bootstrap
- test baseline exists with Vitest and should keep expanding in risky server and action paths
- integration documentation now includes a general playbook plus a focused streaming-provider guide for future contributors

## Known important constraints

- if the user has provided a deployment-specific streaming integration, do not remove it, downgrade it to placeholder state, or replace it unless explicitly asked
- assistant work on streaming should focus on compatibility, reliability, typing, tests, UX wiring, and operability around the user-provided integration
- additional streaming slots can be added, but they must not displace or degrade an existing user-provided integration
- watch sessions are still tracking-first, not synchronized teleparty playback
- iframe-driven watch tracking now persists server-side state and group sessions propagate progress to every joined member in the same room entry, but other browsers still do not see second-by-second live cursor movement unless future realtime fan-out is added
- Better Auth rate limiting stays enabled, but `/sign-in/email` and `/sign-up/email` now use a less aggressive custom rule so local E2E coverage does not trip the default 3-requests-per-10-seconds lockout
- Better Auth-sensitive Playwright flows should use `http://localhost:3000` as the base URL during local runs; `127.0.0.1` counts as a different origin and causes auth requests to fail with `INVALID_ORIGIN`
- the watch playback iframe currently runs without the HTML `sandbox` attribute because the active embed integration needs direct client-side playback/event behavior
- admin/provider UI must not make unsupported compliance or production-readiness claims
- notifications now have modeled defaults and per-user overrides, but delivery is still invite/activity-first rather than a full automation system
- two-factor currently protects password sign-ins; passwordless email-code and magic-link flows are live, but they do not yet trigger the same second-step challenge automatically
- text settings still use direct `DB -> env` fallback, while boolean slot/toggle settings use env bootstrap and then persistent admin overrides
- server-side route protection now reads sessions with `disableCookieCache: true`, because revoked Better Auth sessions must stop working immediately across browsers instead of surviving in cached cookie payloads
- responsive hardening is better in the shell, but still not complete across every complex page
- metadata and preview polish now exist, but any new public-facing route should still ship with deliberate title/description rules instead of falling back to generic app copy
- the authenticated shell now keeps viewport scroll locked and expects the right-hand content card to be the scroll container
- navigation coverage is better, but some domains still rely on summary pages rather than deeper dedicated index views
- SSR and hydration safety matter, especially for date/time formatting and browser-only APIs
- when a server component needs button class variants, import `buttonVariants` from `components/ui/button-styles`, not from the client `components/ui/button` module
- production auto-updaters should prefer immutable version tags rather than `latest` when consuming GHCR images
- schema changes intended for shipped images must include a Prisma migration; `db push` remains a local/dev convenience only
- manual `Publish container image` runs should default to the current runner-native `linux/amd64`; request another platform only when a target host actually needs it
- keep Docker image publish cache under a fixed GitHub Actions scope and prefer `mode=min` to avoid cache sprawl
- after successful image publishes, prune older caches for the publish scope instead of disabling caching entirely
- PRs to `main` are now the automatic verification gate, while merges to `main` are the automatic publish event; bump `package.json` in the branch before merging and keep auto-cancel enabled so superseded runs do not pile up
- the shared day-to-day integration branch is now `kevin`; avoid spinning up extra long-lived branches unless there is a real hotfix or isolation need
- release-workflow shell snippets now execute on the runner host, so any inline `node -e` compatibility logic must stay compatible with the runner's installed Node version instead of assuming modern syntax such as `??`
- the self-hosted runner is containerized, so sibling Docker validation containers must ingest source via `git archive` or similar streaming instead of bind-mounting `${PWD}` directly
- the self-hosted release workflow now prefers shell-based Git checkout over `actions/checkout`, and that bootstrap checkout must stay inline in the workflow because repository scripts are not available until the first fetch has already succeeded
- the self-hosted release workflow should prefer source archives and GitHub HTTP APIs over runner-local Git checkout whenever possible; this runner has been unreliable with URL credentials, anonymous fetches, raw SHA fetches, and inherited GitHub auth headers across jobs
- the self-hosted release runner currently has only about `2 CPU / 3.2 GiB`, so Docker image builds should avoid duplicating type validation inside `next build` and should keep Node heap usage explicitly bounded
- PR candidate images should use the runner's native `docker build`/`docker push` path instead of a separate Buildx builder container unless multi-platform output is actually required; the extra Buildx container was enough overhead to keep killing candidate builds on this runner
- keep `vitest` and `@vitest/coverage-v8` on the same major/minor line; partial Dependabot merges left the lockfile in a state where `npm ci` could no longer resolve peers on the release runner
- Next 16 typegen is currently inconsistent here; keep the `scripts/typecheck.mjs` stub workaround unless a future Next upgrade removes the missing `.next/types` references cleanly

## Working checklist for future sessions

Before changing code:

- read this file
- read `docs/development-plan.md` if priorities may have shifted
- read `docs/integration-playbook.md` when the task introduces or changes an external integration seam
- read `docs/public-surface.md` when the task changes public pages, metadata, previews, icons, or error/not-found UX
- inspect `git status`
- prefer working from `kevin` unless the task genuinely needs a short-lived side branch
- inspect the affected module instead of guessing from memory

While implementing:

- reuse existing components first
- keep streaming-specific behavior inside `server/services/streaming`
- avoid duplicating form logic or client-only formatting logic
- be explicit about auth checks and route protection
- avoid regressions in Docker startup or local setup flow
- when touching `prisma/schema.prisma`, add/update `prisma/migrations` in the same change so published images and `npm run db:check-migrations` stay green
- keep `minio`, `minio-init`, and `media-cdn` healthy when touching storage, env, or compose
- prefer CDN-backed movie artwork URLs over raw TMDB image paths for persisted library entries
- keep invite UX split clearly between list invites and the optional app-friends graph in profile
- when expanding Playwright coverage, keep auth-heavy specs serial or consciously revisit the custom Better Auth rate-limit thresholds before increasing account-creation volume
- keep `scripts/run-ci-validation.sh` archive-friendly: workflow jobs may provide a plain extracted source tree without `.git`, so the validation path must fall back to `tar` when Git metadata is unavailable

Before finishing:

- run the relevant subset of `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`
- run Docker verification when touching runtime, env, startup, or deployment behavior
- update this file if priorities, blockers, or rules changed
- commit meaningful finished work

## Fundamental rules

- Reusable components first: prefer shared controls in `components/forms`, `components/time`, `components/ui`, and `components/realtime`.
- Keep boundaries clear: UI in `components`, orchestration in `features`, business logic in `server/services`.
- Streaming abstraction must stay swappable: provider-specific code belongs only under `server/services/streaming`.
- Do not remove or downgrade user-provided streaming integrations: if the user has wired a provider, preserve it and only improve or extend it unless explicitly told otherwise.
- Do not reintroduce the HTML `sandbox` attribute on the watch playback iframe unless the user explicitly asks for it and the active provider has been verified to keep playback and client-side events working correctly.
- No fake completeness: if a provider is truly placeholder-only, UI and docs must say so clearly, but do not relabel a user-provided integration as placeholder.
- Server-first rendering: prefer server components and actions; when client rendering is required, make hydration-safe choices.
- Metadata routes and social-image rendering must stay build-safe with `next/og` limitations; use only supported inline CSS and avoid browser-only styling assumptions there.
- Security before convenience: protect search/admin/realtime endpoints, validate env in production, and keep secrets out of defaults.
- Session revocation must be real-time from the user's perspective: protected app routes should prefer a fresh Better Auth session lookup over cached cookie session payloads.
- Installation must stay easy: preserve `npm run setup`, reliable Docker startup, and clear README steps.
- Production install should prefer tagged registry images over rebuilding from source on the target host.
- Development should prefer `npm run dev` or the dedicated `app-dev` compose service over rebuilding the production image.
- Production container bootstrap must stay migration-first: use `prisma migrate deploy` plus explicit compatibility handling for legacy installs, not `prisma db push`.
- Legacy production repair must not assume that `_prisma_migrations` means the schema is healthy; verify drift against `prisma/schema.prisma` and repair missing columns/indexes before the app starts serving traffic.
- Container-exposed operational scripts must run without dev-only toolchains such as `tsx`.
- When deploying through Portainer or a source-free host, do not assume relative bind-mounted files exist; ensure `infra/nginx/media-cdn.conf` is present on disk or use an absolute host path/Git-backed stack.
- When bootstrapping MinIO buckets in Compose, wait for `mc ready` before running `mc mb` or anonymous-policy commands; `mc alias set` alone is not a sufficient readiness gate.

## Suggested next priorities

- finish responsive and UI/UX cleanup, especially in complex collaborative pages beyond the shell
- expand navigation depth only when the destination has a real page behind it; avoid dead sidebar links
- implement richer presence and notifications without relying only on full refresh or summary cards alone
- expand tests around server actions and list/watch flows
- improve the existing user-provided streaming integration through safer typing, tests, UI wiring, and operational tooling
- extend the new media/image layer, notification automation, and auth roadmap without reintroducing dead-end one-off UI
- keep refining copy and form polish so user-facing pages stay plain-language and non-technical

## Update log

- March 9, 2026: added durable session rules, reusable-component guidance, auth-flow note, Docker/runtime note, and explicit reminder that `vixsrc` is still not integrated
- March 9, 2026: clarified provider maturity/compliance metadata so `vixsrc` stays visibly scaffold-only across service, admin UI, and watch-session messaging
- March 9, 2026: aligned the deployment-specific streaming provider type shape with the admin UI contract so custom provider metadata can compile cleanly
- March 9, 2026: moved the admin-promotion CLI to a runtime-safe Node script so it works inside the production Docker container
- March 9, 2026: added a persistent rule that user-provided streaming integrations must not be removed, downgraded to placeholder, or replaced by the assistant
- March 9, 2026: shipped a first notifications inbox, fixed the broken navbar account/actions flow, and added a minimal installable PWA shell with offline fallback
- March 9, 2026: added registry-first deployment support with GitHub Actions image publishing and a production compose file that pulls prebuilt images
- March 9, 2026: added a dedicated Docker dev flow with mounted source, cached dependencies, and Next.js hot reload to avoid repeated production builds
- March 9, 2026: shipped progressive single-form access, future auth-method planning in admin, and self-hosted media storage plus media-cdn for avatars and list covers
- March 9, 2026: expanded sidebar navigation with dedicated `/lists` and `/watch` index pages so core areas are reachable without routing everything through the dashboard
- March 9, 2026: fixed admin toggle form handling, generalized streaming-provider messaging in admin/watch UI, and added a configurable Plex provider slot
- March 9, 2026: added CDN-backed mirroring for persisted TMDB movie artwork and wired list/detail pages to prefer local media URLs
- March 9, 2026: completed the notifications inbox with persistent read state, unread counts in the shell, and per-item/bulk inbox actions
- March 10, 2026: added reusable integration documentation for future contributors in `docs/integration-playbook.md` and `docs/streaming-provider-guide.md`
- March 10, 2026: added iframe-driven watch tracking persistence through `/api/watch/events`, automatic heartbeat/end checkpoints, and a client embed listener that avoids refresh-driven playback resets
- March 10, 2026: relaxed the iframe event listener to trust the first valid player origin and accept stringified numeric payloads, while tightening poster layouts so movie artwork fills its frame consistently
- March 10, 2026: aligned admin-configurable services with env/bootstrap parity by adding env support for TMDB language, SMTP secure/port handling, access-method planning toggles, and streaming slot activation defaults
- March 10, 2026: removed the watch-page iframe `sandbox` attribute so the current playback provider can use its native client-side behavior and event flow
- March 10, 2026: documented the GHCR package-publication flow and added a production install tutorial for images published by GitHub Actions
- March 10, 2026: documented the Portainer/Linux bind-mount caveat for `media-cdn` and the need to align MinIO app credentials with the active MinIO user
- March 10, 2026: documented that `minio-init` should use `mc ready` before bucket/policy commands to avoid early-init failures in Linux and Portainer deployments
- March 10, 2026: added account-level light/dark theme toggling, persisted browser preference, and dark-mode shell/background gradients
- March 11, 2026: shipped manager roles, layered list invites, movie removal, React Email invite templates, notification defaults/user overrides, device push subscriptions, and a Playwright smoke/a11y baseline
- March 11, 2026: manual `Publish container image` runs now default `publish_latest` to false, and production deployments should prefer immutable version tags over `latest`
- March 11, 2026: stabilized `npm run typecheck` with a dedicated script because Next 16 typegen was intermittently omitting `.next/types` stub files needed by plain `tsc`
- March 11, 2026: expanded the Playwright suite into full-site flows, hardened auth helpers to wait on real `/api/auth/*` responses, and raised Better Auth sign-in/sign-up burst limits enough for local E2E coverage without disabling rate limiting
- March 11, 2026: finished the first real auth-method rollout with email codes, magic links, passkeys, profile security controls, clearer push setup guidance, owner-side list deletion, internal shell-only scrolling, and a broader copy/form polish pass
- March 11, 2026: stabilized the profile security page, fixed Better Auth magic-link verification against Prisma, moved list management to a dedicated settings page, persisted list ordering preferences, and upgraded watch tracking to maintain per-user movie progress across partial group sessions
- March 11, 2026: added admin-configurable VAPID key storage with env fallback, fixed the server-component `buttonVariants` import regression on list pages, and refreshed the Playwright suite to match the live UI while filtering known third-party iframe console noise
- March 11, 2026: added profile-level active session management and recent access history, verified cross-device session revocation with Playwright, and switched protected-session reads to bypass Better Auth cookie cache so revoked sessions are rejected immediately
- March 11, 2026: added branded app metadata polish with generated icons, social preview images, custom 404/error states, public-route invite metadata, robots/sitemap routes, and smoke coverage for metadata plus missing-route recovery
- March 11, 2026: consolidated the new metadata/error/icon work into `docs/public-surface.md` and linked it from the README so future sessions treat public-surface polish as a maintained part of the product, not as optional cleanup
- March 12, 2026: replaced production `prisma db push` bootstrapping with migration-based deploys, added a legacy baseline bridge for older installs without `_prisma_migrations`, and added a workflow check to block image publishes when Prisma schema changes are missing migrations
- March 12, 2026: changed manual image-publish runs to default to the current runner-native `linux/amd64` platform so one-off publishes stay cheap on the active self-hosted runner unless another target is explicitly requested
- March 12, 2026: constrained Docker BuildKit caching in the publish workflow to a fixed GHA scope with `mode=min` so repeated publish runs stop generating excessive cache entries
- March 12, 2026: added post-publish cache pruning so the workflow keeps a small recent set of Docker publish caches instead of accumulating every stale cache forever
- March 12, 2026: switched the release workflow to a branch-first model where PRs to `main` auto-run verification, merges to `main` auto-publish the semver from `package.json`, and concurrency auto-cancels superseded runs
- March 12, 2026: replaced the optimistic legacy migration bridge with Prisma diff-based schema repair so older installs and mis-baselined production databases both recover missing columns before the app boots
- March 12, 2026: moved release validation onto an explicit Docker-based validation script on the self-hosted runner, standardized day-to-day branch work on `kevin`, and now let the automatic candidate path detect the runner's native Docker architecture instead of forcing an emulated target
- March 12, 2026: realigned the production Dockerfile to `node:22-alpine`, matching the app's declared Node engine, and added npm fetch retry settings to reduce transient network failures during registry-backed image builds
- March 12, 2026: kept the merged release workflow compatible with the runner host's older Node runtime by removing nullish-coalescing syntax from inline `node -e` release metadata parsing
- March 12, 2026: updated the Docker-based validation script to stream the repository into sibling containers with `git archive`, because bind-mounting `${PWD}` from the containerized self-hosted runner exposed an empty host path to Docker and broke `npm ci`
- March 12, 2026: replaced `actions/checkout` with inline shell-based `git fetch` checkout logic in the self-hosted release workflow after checkout started failing on missing runner file-command paths during manual and PR-triggered runs
- March 12, 2026: realigned `@vitest/coverage-v8` to `4.0.18` after a partial dependency update on `main` left the release workflow unable to complete `npm ci`
- March 12, 2026: recreated the shared `kevin` integration branch from `main`, pinned the root ESLint dependency back to `9.39.4` after clean Docker validation exposed an `eslint-config-next` crash under ESLint 10, taught `scripts/run-ci-validation.sh` to inject minimal Better Auth env vars for clean builds, and noted that local Playwright auth runs must target `localhost` rather than `127.0.0.1`
- March 12, 2026: stabilized the self-hosted workflow checkout around header-authenticated Git fetches against advertised refs after URL-embedded credentials, anonymous fetches, and raw SHA fetches all proved unreliable on the runner
- March 12, 2026: reduced self-hosted runner build pressure by making both candidate-image builds and Dockerized PR validation skip duplicate TypeScript validation inside `next build`, while also capping `NODE_OPTIONS` during container builds after the 3.2 GiB runner was killing those builds with exit code 137
- March 12, 2026: switched PR candidate publishing from `docker/build-push-action` to native `docker build` plus `docker push`, because the separate Buildx builder container still ran out of headroom on the 3.2 GiB self-hosted runner even after the lighter container build mode landed
- March 12, 2026: switched the self-hosted workflow toward codeload/API-based source acquisition, taught `scripts/run-ci-validation.sh` to validate plain extracted source trees without `.git`, and stopped relying on runner-local Git fetch for PR/manual verification because checkout auth state on the runner remained unreliable
