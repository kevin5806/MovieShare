# Integration Playbook

Last updated: March 10, 2026

This guide is for contributors who want to add or extend integrations in `movieshare`
without breaking the current modular boundaries.

## Scope

Use this playbook when adding or extending:

- external APIs
- media/storage adapters
- streaming providers
- auth-related integrations
- notification or delivery channels
- operational integrations exposed through admin/runtime settings

## Core rule

Keep the domain stable and make the integration the replaceable part.

In this repository that means:

- UI lives in `components/`
- form parsing and server actions live in `features/`
- business logic and third-party wiring live in `server/services/`
- durable data shape lives in `prisma/schema.prisma`
- user-facing operational notes live in `README.md` and `docs/`

## Before you code

1. Read [session-handbook.md](./session-handbook.md).
2. Inspect the existing service in the same domain before creating a new one.
3. Decide whether the integration is:
   - required at bootstrap
   - optional and env-driven
   - configurable from admin
   - deployment-specific
4. Decide what the fallback should be when the integration is not configured.

## Preferred integration shape

For most integrations, follow this shape:

1. Add env parsing in `server/env.ts`.
2. Add or extend persistence in `prisma/schema.prisma` only if the runtime needs durable state.
3. Implement the integration under `server/services/<domain>.ts` or a focused subfolder.
4. Keep route handlers and server actions thin; they should call the service, not hold the integration logic.
5. Expose only the minimum data needed by the UI.
6. Add tests around the service seam first.

## Checklist

### Runtime config

- add new env vars in `server/env.ts`
- document them in `.env.example`
- document production variants in `.env.production.example` if relevant
- prefer empty-string defaults for optional integrations

### Data model

- only add Prisma fields when the integration needs persisted state or cached output
- run `npm run db:generate`
- run `npm run db:push`

### Service layer

- isolate remote fetches, SDK clients, URL builders, and mapping logic in `server/services`
- make missing config return a controlled fallback where possible
- keep side effects explicit

### Admin/runtime controls

- if the integration is operationally configurable, surface it from `server/services/system-config.ts`
- only add admin UI when the user can actually do something useful with it
- do not claim production readiness in the UI unless the runtime is genuinely ready

### UI layer

- prefer reusable components over page-local one-offs
- keep loading/error copy specific and actionable
- avoid client-only formatting bugs and hydration mismatches

### Verification

- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- if runtime behavior changed: verify Docker with `docker compose up -d --build app`

## Recommended patterns by category

### External metadata API

Use the `TMDB` integration as the reference shape:

- fetch and mapping in `server/services/tmdb-service.ts`
- runtime config from `server/services/system-config.ts`
- keep remote payload types local to the service
- cache only the fields the product actually uses

### Media/storage integration

Use `server/services/media-storage.ts` as the reference shape:

- centralize upload, delete, public URL building, and remote mirroring
- prefer storing public URLs plus enough source metadata to refresh them later
- make UI consume helper functions instead of hardcoded remote origins

### Notification-like integration

Use `server/services/notification-service.ts` as the reference shape:

- derive a normalized feed shape in the service
- keep read/unread state durable if it matters to the UX
- let the shell badge read from the same service contract as the page

### Auth/access integration

- keep Better Auth and session rules centralized
- treat admin toggles as roadmap/runtime state unless the auth path is truly wired
- always revalidate the surfaces that expose access state

### Streaming integration

Use [streaming-provider-guide.md](./streaming-provider-guide.md) for the provider-specific seam.

## Anti-patterns to avoid

- putting third-party fetch code directly in pages or components
- duplicating env parsing in multiple modules
- adding admin switches that do not connect to any runtime behavior
- coupling the product to one provider when there is already an abstraction seam
- claiming that a deployment-specific adapter is compliant or production-ready from assistant-authored code

## Documentation to update

When an integration changes meaningfully, update:

- `README.md`
- `docs/session-handbook.md`
- `docs/development-plan.md` if roadmap status changed
- any deployment doc touched by the integration, such as `docs/container-registry.md`

## Git hygiene

- keep integration work in focused commits
- do not revert user-provided integrations unless explicitly asked
- if the integration changes Docker/runtime behavior, mention it clearly in the commit message
