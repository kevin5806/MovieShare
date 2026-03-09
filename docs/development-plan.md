# Development Plan

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

## Phase 4

- add realtime transport and event broker
- live list updates, feedback updates and presence indicators
- session heartbeat, resume synchronization and collaborative controls
- notifications and email delivery flows

## Open Notes

- streaming provider support must stay abstract and swappable
- provider-specific code belongs under `server/services/streaming`
- selection logic should remain testable and deterministic for most modes
- avoid premature generic abstractions outside real extension seams
- prefer server components and server actions unless client interactivity is required
