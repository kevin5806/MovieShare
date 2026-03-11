# Session Handbook

Last updated: March 11, 2026

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
- keep the new media storage stack stable so profile/list imagery stays easy to operate
- improve production readiness without making unsupported compliance or deployment claims about streaming integrations
- keep admin configuration controls working end-to-end, especially toggle-based forms

## Current state snapshot

- authentication now uses a single access flow on `/login`, with `/register` kept as a compatibility redirect
- the access flow is now progressive: users start from one form and only see onboarding fields if the email is new
- realtime live refresh exists through the self-hosted SSE route and broker
- watch playback pages can now ingest iframe `PLAYER_EVENT` messages and persist automatic progress updates without forcing a full-page refresh
- the watch embed listener is now tolerant of numeric-string payloads and deployment-specific iframe origins, and movie posters are being normalized toward full-bleed cover frames
- collaborative lists now support `OWNER`, `MANAGER`, and `MEMBER` roles, owner-side member moderation, and movie removal by proposer or manager
- list invites now support app-user delivery, email-bound links, and reusable public links with optional target role and usage limits
- React Email now drives invite delivery, while notification defaults and per-user overrides cover in-app, email, and push channels
- device push subscriptions can now be managed from the profile when VAPID is configured and push is enabled by admin
- a Playwright plus axe-core smoke harness now exists for UI/client-side regression coverage
- the Playwright suite now covers admin, auth, collaboration, lists/watch, profile/notifications, offline and client-error monitoring end-to-end against the Dockerized app
- `npm run typecheck` now goes through `scripts/typecheck.mjs` because Next 16 typegen is intermittently leaving missing `.next/types` stub files on this project
- the app shell now exposes working notification and account actions instead of dead navbar controls
- the sidebar now exposes dedicated sections and direct menus for dashboard, lists, watch sessions, notifications, profile, and admin
- the notifications inbox now has persistent read state, filterable feed actions, and shell badge counts driven by unread items
- a first PWA baseline exists with manifest, service worker registration, install prompt, icon and offline page
- registry-first deployment is now supported through prebuilt images, GitHub Actions publishing, and a source-free production compose file
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
- iframe-driven watch tracking now persists server-side state, but other viewers still do not see second-by-second position changes unless future realtime fan-out is added
- Better Auth rate limiting stays enabled, but `/sign-in/email` and `/sign-up/email` now use a less aggressive custom rule so local E2E coverage does not trip the default 3-requests-per-10-seconds lockout
- the watch playback iframe currently runs without the HTML `sandbox` attribute because the active embed integration needs direct client-side playback/event behavior
- admin/provider UI must not make unsupported compliance or production-readiness claims
- notifications now have modeled defaults and per-user overrides, but delivery is still invite/activity-first rather than a full automation system
- the access-method admin section is roadmap/config-first today; only email/password is live until future Better Auth wiring is explicitly added
- text settings still use direct `DB -> env` fallback, while boolean slot/toggle settings use env bootstrap and then persistent admin overrides
- responsive hardening is better in the shell, but still not complete across every complex page
- navigation coverage is better, but some domains still rely on summary pages rather than deeper dedicated index views
- SSR and hydration safety matter, especially for date/time formatting and browser-only APIs
- production auto-updaters should prefer immutable version tags rather than `latest` when consuming GHCR images
- Next 16 typegen is currently inconsistent here; keep the `scripts/typecheck.mjs` stub workaround unless a future Next upgrade removes the missing `.next/types` references cleanly

## Working checklist for future sessions

Before changing code:

- read this file
- read `docs/development-plan.md` if priorities may have shifted
- read `docs/integration-playbook.md` when the task introduces or changes an external integration seam
- inspect `git status`
- inspect the affected module instead of guessing from memory

While implementing:

- reuse existing components first
- keep streaming-specific behavior inside `server/services/streaming`
- avoid duplicating form logic or client-only formatting logic
- be explicit about auth checks and route protection
- avoid regressions in Docker startup or local setup flow
- keep `minio`, `minio-init`, and `media-cdn` healthy when touching storage, env, or compose
- prefer CDN-backed movie artwork URLs over raw TMDB image paths for persisted library entries
- keep invite UX split clearly between list invites and the optional app-friends graph in profile
- when expanding Playwright coverage, keep auth-heavy specs serial or consciously revisit the custom Better Auth rate-limit thresholds before increasing account-creation volume

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
- Security before convenience: protect search/admin/realtime endpoints, validate env in production, and keep secrets out of defaults.
- Installation must stay easy: preserve `npm run setup`, reliable Docker startup, and clear README steps.
- Production install should prefer tagged registry images over rebuilding from source on the target host.
- Development should prefer `npm run dev` or the dedicated `app-dev` compose service over rebuilding the production image.
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
