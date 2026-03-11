# Development Plan

## Status Snapshot

Last updated: March 11, 2026

- Phase 1: completed
- Phase 2: completed
- Phase 3: completed
- Phase 4: in progress

## Current Baseline Shipped

- modular monolith on Next.js App Router with TypeScript, Tailwind, shadcn/ui, Prisma, PostgreSQL and Better Auth
- landing, authentication, dashboard, list, movie detail, selection, watch session, profile and admin pages
- notifications inbox page for invites, live sessions and recent activity
- single progressive access form that branches into onboarding only when the email is new
- admin-configurable email code, magic link and passkey access on the shared login screen
- profile-level passkey and authenticator settings for eligible accounts
- profile-level active session management and recent access history
- TMDB-backed movie search with local caching of essential metadata
- collaborative lists with owner/manager/member roles, invite management and movie removal controls
- owner-side list deletion
- dedicated list settings page for presentation, invites, member permissions and deletion
- persisted per-user list organization preferences for ordering and proposer filters
- layered list invites for app users, restricted email links and public links
- admin notification defaults plus per-user notification overrides
- web push subscriptions and delivery baseline
- admin-managed VAPID keys with environment fallback
- React Email templates aligned with the app UI for invites and auth emails
- profile avatars and list-cover uploads backed by self-hosted media storage
- watch sessions with group membership, per-user movie progress, resume state and manual playback checkpoints
- streaming provider abstraction with admin-managed runtime configuration
- media storage stack with MinIO and an internal media-cdn service
- self-hosted SSE broker with live refresh on list, selection, movie-detail and watch-session pages
- installable PWA baseline with manifest, service worker registration and offline fallback page
- Playwright plus axe-core smoke coverage for browser/UI regressions
- registry-first deployment path through GitHub Actions image publishing and source-free production Docker Compose
- dedicated Docker development path with mounted source and hot reload instead of production rebuilds
- initial reusable form controls for select, switch, checkbox lists and server-safe time rendering
- Docker Compose self-hosting setup and living project documentation
- contributor documentation for adding external integrations and streaming providers

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

### Phase 4 progress

- completed: self-hosted SSE event broker and route
- completed: live refresh wiring for list, selection, movie detail and watch-session flows
- completed: first reusable form-control pass for admin and movie-detail pages
- completed: first notifications inbox and working topbar account/notification actions
- completed: minimal PWA install/offline shell
- completed: role-aware list management with manager promotions, member moderation and movie removal
- completed: dedicated list settings page plus persisted ordering/proposer preferences for each viewer
- completed: layered list invite flows for app users, email-bound links and public links
- completed: notification defaults, per-user overrides and React Email invite templates
- completed: web push baseline with device subscriptions, admin-configurable master switch and admin-managed VAPID keys
- completed: Playwright + axe-core smoke harness for UI validation
- completed: Playwright runtime coverage aligned with the current UI copy and flows against the Dockerized app
- completed: registry-first image publishing and source-free production deployment path
- completed: self-hosted media storage and image delivery for avatars and list covers
- completed: admin roadmap section for future access methods
- completed: first real auth-method rollout for email code, magic link, passkeys and profile 2FA controls
- completed: profile session/access management with cross-device sign-out coverage
- completed: per-user watch progress model with grouped room propagation for shared in-room sessions
- in progress: responsive hardening, streaming UX cleanup and richer presence behavior
- pending: presence indicators without full refresh, richer collaborative playback controls, stronger PWA shell and broader notification automation

## Open Notes

- streaming provider support must stay abstract and swappable
- provider-specific code belongs under `server/services/streaming`
- selection logic should remain testable and deterministic for most modes
- avoid premature generic abstractions outside real extension seams
- prefer server components and server actions unless client interactivity is required
- current missing production areas are richer selection heuristics, full PWA polish, stronger presence and notifications, full responsive hardening and a real streaming adapter
- current missing production areas also include broader push automation, digests and background/offline polish beyond the baseline service-worker implementation
- current missing production areas also include deeper auth hardening, especially broader 2FA enforcement outside the password flow
- current missing production areas also include broader account-security ergonomics beyond the new session manager, especially richer device naming and stronger second-factor coverage across every auth method
- current missing production areas also include richer live presence for watch sessions; the progress model is in place, but second-by-second co-presence updates are still summary-driven rather than fully realtime
- future integrations should follow the new `docs/integration-playbook.md` and `docs/streaming-provider-guide.md` documents instead of inventing new seams ad hoc
