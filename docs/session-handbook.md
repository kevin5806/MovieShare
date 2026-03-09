# Session Handbook

Last updated: March 9, 2026

## How to use this file

- Read this file at the beginning of each non-trivial session.
- Update it after significant implementation, security, UX, architecture, or deployment changes.
- Treat it as the durable handoff between sessions.

## Current objectives

- keep `movieshare` as a modular monolith with clear boundaries between `app`, `components`, `features`, and `server`
- keep the UI moving toward reusable primitives instead of page-specific logic
- continue Phase 4 hardening: responsive cleanup, stronger presence/notifications, and better PWA polish
- keep installation and first-run experience simple on fresh machines
- keep the new media storage stack stable so profile/list imagery stays easy to operate
- improve production readiness without making unsupported compliance or deployment claims about streaming integrations
- keep admin configuration controls working end-to-end, especially toggle-based forms

## Current state snapshot

- authentication now uses a single access flow on `/login`, with `/register` kept as a compatibility redirect
- the access flow is now progressive: users start from one form and only see onboarding fields if the email is new
- realtime live refresh exists through the self-hosted SSE route and broker
- the app shell now exposes working notification and account actions instead of dead navbar controls
- the sidebar now exposes dedicated sections and direct menus for dashboard, lists, watch sessions, notifications, profile, and admin
- a first notifications inbox exists for list invites, friend invites, live sessions and recent activity
- a first PWA baseline exists with manifest, service worker registration, install prompt, icon and offline page
- registry-first deployment is now supported through prebuilt images, GitHub Actions publishing, and a source-free production compose file
- Docker development now has a separate hot-reload path that avoids production rebuilds for normal iteration
- MinIO-backed media storage plus the `media-cdn` service now power profile avatars and list-cover images
- the admin panel now tracks future auth-method rollout intent and prerequisites
- the admin panel now exposes multiple configurable streaming slots, including `vixsrc` and `plex`
- reusable form/time primitives exist and should be extended before creating new UI variants
- Docker runtime has been optimized with a much smaller multi-stage image and a working startup bootstrap
- test baseline exists with Vitest and should keep expanding in risky server and action paths

## Known important constraints

- if the user has provided a deployment-specific streaming integration, do not remove it, downgrade it to placeholder state, or replace it unless explicitly asked
- assistant work on streaming should focus on compatibility, reliability, typing, tests, UX wiring, and operability around the user-provided integration
- additional streaming slots can be added, but they must not displace or degrade an existing user-provided integration
- watch sessions are still tracking-first, not synchronized teleparty playback
- admin/provider UI must not make unsupported compliance or production-readiness claims
- notifications are still summary-first: there is no read state, delivery preference model, or push channel yet
- the access-method admin section is roadmap/config-first today; only email/password is live until future Better Auth wiring is explicitly added
- responsive hardening is better in the shell, but still not complete across every complex page
- navigation coverage is better, but some domains still rely on summary pages rather than deeper dedicated index views
- SSR and hydration safety matter, especially for date/time formatting and browser-only APIs

## Working checklist for future sessions

Before changing code:

- read this file
- read `docs/development-plan.md` if priorities may have shifted
- inspect `git status`
- inspect the affected module instead of guessing from memory

While implementing:

- reuse existing components first
- keep streaming-specific behavior inside `server/services/streaming`
- avoid duplicating form logic or client-only formatting logic
- be explicit about auth checks and route protection
- avoid regressions in Docker startup or local setup flow
- keep `minio`, `minio-init`, and `media-cdn` healthy when touching storage, env, or compose

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
- No fake completeness: if a provider is truly placeholder-only, UI and docs must say so clearly, but do not relabel a user-provided integration as placeholder.
- Server-first rendering: prefer server components and actions; when client rendering is required, make hydration-safe choices.
- Security before convenience: protect search/admin/realtime endpoints, validate env in production, and keep secrets out of defaults.
- Installation must stay easy: preserve `npm run setup`, reliable Docker startup, and clear README steps.
- Production install should prefer tagged registry images over rebuilding from source on the target host.
- Development should prefer `npm run dev` or the dedicated `app-dev` compose service over rebuilding the production image.
- Container-exposed operational scripts must run without dev-only toolchains such as `tsx`.

## Suggested next priorities

- finish responsive and UI/UX cleanup, especially in complex collaborative pages beyond the shell
- expand navigation depth only when the destination has a real page behind it; avoid dead sidebar links
- implement richer presence and notifications without relying only on full refresh or summary cards alone
- expand tests around server actions and list/watch flows
- improve the existing user-provided streaming integration through safer typing, tests, UI wiring, and operational tooling
- extend the new media/image layer and auth roadmap without reintroducing dead-end one-off UI

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
