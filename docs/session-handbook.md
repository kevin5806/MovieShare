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
- improve production readiness without making unsupported compliance or deployment claims about streaming integrations

## Current state snapshot

- authentication now uses a single access flow on `/login`, with `/register` kept as a compatibility redirect
- realtime live refresh exists through the self-hosted SSE route and broker
- the app shell now exposes working notification and account actions instead of dead navbar controls
- a first notifications inbox exists for list invites, friend invites, live sessions and recent activity
- a first PWA baseline exists with manifest, service worker registration, install prompt, icon and offline page
- reusable form/time primitives exist and should be extended before creating new UI variants
- Docker runtime has been optimized with a much smaller multi-stage image and a working startup bootstrap
- test baseline exists with Vitest and should keep expanding in risky server and action paths

## Known important constraints

- if the user has provided a deployment-specific streaming integration, do not remove it, downgrade it to placeholder state, or replace it unless explicitly asked
- assistant work on streaming should focus on compatibility, reliability, typing, tests, UX wiring, and operability around the user-provided integration
- watch sessions are still tracking-first, not synchronized teleparty playback
- admin/provider UI must not make unsupported compliance or production-readiness claims
- notifications are still summary-first: there is no read state, delivery preference model, or push channel yet
- responsive hardening is better in the shell, but still not complete across every complex page
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
- Container-exposed operational scripts must run without dev-only toolchains such as `tsx`.

## Suggested next priorities

- finish responsive and UI/UX cleanup, especially in complex collaborative pages beyond the shell
- implement richer presence and notifications without relying only on full refresh or summary cards alone
- expand tests around server actions and list/watch flows
- improve the existing user-provided streaming integration through safer typing, tests, UI wiring, and operational tooling

## Update log

- March 9, 2026: added durable session rules, reusable-component guidance, auth-flow note, Docker/runtime note, and explicit reminder that `vixsrc` is still not integrated
- March 9, 2026: clarified provider maturity/compliance metadata so `vixsrc` stays visibly scaffold-only across service, admin UI, and watch-session messaging
- March 9, 2026: aligned the deployment-specific streaming provider type shape with the admin UI contract so custom provider metadata can compile cleanly
- March 9, 2026: moved the admin-promotion CLI to a runtime-safe Node script so it works inside the production Docker container
- March 9, 2026: added a persistent rule that user-provided streaming integrations must not be removed, downgraded to placeholder, or replaced by the assistant
- March 9, 2026: shipped a first notifications inbox, fixed the broken navbar account/actions flow, and added a minimal installable PWA shell with offline fallback
