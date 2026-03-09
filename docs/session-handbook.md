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
- improve production readiness without pretending unfinished streaming features are complete

## Current state snapshot

- authentication now uses a single access flow on `/login`, with `/register` kept as a compatibility redirect
- realtime live refresh exists through the self-hosted SSE route and broker
- reusable form/time primitives exist and should be extended before creating new UI variants
- Docker runtime has been optimized with a much smaller multi-stage image and a working startup bootstrap
- test baseline exists with Vitest and should keep expanding in risky server and action paths

## Known important constraints

- `vixsrc` is still a placeholder provider, not a real playback integration
- watch sessions are still tracking-first, not synchronized teleparty playback
- admin/provider UI must not imply that placeholder adapters are production-ready
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
- No fake completeness: if playback is placeholder-only, UI and docs must say so clearly.
- Server-first rendering: prefer server components and actions; when client rendering is required, make hydration-safe choices.
- Security before convenience: protect search/admin/realtime endpoints, validate env in production, and keep secrets out of defaults.
- Installation must stay easy: preserve `npm run setup`, reliable Docker startup, and clear README steps.
- Container-exposed operational scripts must run without dev-only toolchains such as `tsx`.

## Suggested next priorities

- finish responsive and UI/UX cleanup, especially in complex collaborative pages
- implement richer presence and notifications without relying only on full refresh
- expand tests around server actions and list/watch flows
- decide whether to implement a real streaming adapter or keep the product explicitly tracking-only for now

## Update log

- March 9, 2026: added durable session rules, reusable-component guidance, auth-flow note, Docker/runtime note, and explicit reminder that `vixsrc` is still not integrated
- March 9, 2026: clarified provider maturity/compliance metadata so `vixsrc` stays visibly scaffold-only across service, admin UI, and watch-session messaging
- March 9, 2026: aligned the deployment-specific streaming provider type shape with the admin UI contract so custom provider metadata can compile cleanly
- March 9, 2026: moved the admin-promotion CLI to a runtime-safe Node script so it works inside the production Docker container
