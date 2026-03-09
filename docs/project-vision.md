# movieshare Vision

## Product direction

movieshare is a self-hosted collaborative movie list application designed for small groups of friends.
The product focus is:

- shared curation instead of solo watchlists
- clear social context on every movie proposal
- lightweight decision support to pick the next movie
- a future-ready foundation for tracked group watching, with optional realtime sync later

## Experience goals

- calm and highly legible UI
- information density inspired by Notion without feeling sterile
- fast navigation between dashboard, lists, movies, selection and watch sessions
- visible collaborative state: members, feedback, activity, progress and future presence
- fully responsive experience across mobile, tablet and desktop
- installable PWA experience with a polished app-like feel for self-hosted users

## Architecture principles

- Next.js App Router monolith
- modular boundaries by feature, not by microservice
- Prisma as single source of truth for application data
- Better Auth for session and account management
- isolated integrations for TMDB and streaming providers
- realtime-ready domain model with event-oriented extension points

## Domain priorities

### Current

- shared lists with members and invites
- cached TMDB movie metadata
- member feedback on each list item
- multiple selection modes with simple initial logic
- watch session lifecycle with checkpoints and group membership
- system-level streaming provider configuration
- tracking of who started a title and where they stopped, even without embedded playback

### Next

- realtime list updates and feedback presence
- invite flows by email and friend graph improvements
- richer selection heuristics by mood, availability and group preferences
- notifications and digest emails
- provider catalog and availability by country/provider
- production-grade responsive refinement across all authenticated flows
- stronger PWA capabilities such as install prompts, offline-aware shell and mobile polish

## Realtime vision

The project should evolve toward a realtime collaboration layer that can support:

- collaborative updates on list contents
- feedback changes reflected live
- online presence and active members
- shared watch sessions with controller/follower states
- progress heartbeats and resumable playback

The current codebase should therefore prefer:

- explicit domain events
- persistence models that capture session and presence state
- thin transport adapters that can later be backed by WebSocket or SSE infrastructure
