# Development Plan

## Status Snapshot

Last updated: March 9, 2026

- Phase 1: completed
- Phase 2: completed
- Phase 3: completed
- Phase 4: planned

## Current Baseline Shipped

- modular monolith on Next.js App Router with TypeScript, Tailwind, shadcn/ui, Prisma, PostgreSQL and Better Auth
- landing, authentication, dashboard, list, movie detail, selection, watch session, profile and admin pages
- TMDB-backed movie search with local caching of essential metadata
- collaborative lists with members, owner controls, list invites and friend invites
- watch sessions with group membership, resume state and manual playback checkpoints
- streaming provider abstraction with admin-managed runtime configuration
- Docker Compose self-hosting setup and living project documentation

## Phase 1

- bootstrap Next.js 16, Tailwind, shadcn/ui, Prisma, Better Auth
- establish folder conventions for `app`, `components`, `features`, `server`, `prisma`, `docs`
- define first Prisma schema with auth, collaborative lists, feedback, selection and watch sessions

## Phase 2

- implement auth flows with guarded app routes
- ship dashboard, list page, movie detail, selection page, watch page, profile and admin sections
- integrate TMDB search and local metadata caching
- add movie insertion flow from TMDB into a shared list

## Phase 3

- add system admin tools for streaming provider lifecycle
- implement provider abstraction and persistence
- improve watch session creation, member selection and checkpoint updates
- introduce activity logging and friend invite flows
- add list invite creation, acceptance links and owner controls
- connect SMTP-backed invite delivery to runtime admin settings

## Phase 4

- add realtime transport and event broker
- live list updates, feedback updates and presence indicators
- session heartbeat, resume synchronization and collaborative controls
- notifications center and delivery preferences
- complete responsive QA and layout refinement for mobile, tablet and desktop
- evolve the app into a stronger PWA with installability and offline-aware shell behavior

## Open Notes

- streaming provider support must stay abstract and swappable
- provider-specific code belongs under `server/services/streaming`
- selection logic should remain testable and deterministic for most modes
- avoid premature generic abstractions outside real extension seams
- prefer server components and server actions unless client interactivity is required
- current missing production areas are realtime transport, richer selection heuristics, full PWA polish, full responsive hardening and a real streaming adapter
