# Streaming Provider Guide

Last updated: March 10, 2026

This guide explains how to add or extend a streaming provider inside `movieshare`
without breaking the existing abstraction.

## Important constraint

If a deployment-specific provider integration was supplied by the user, do not remove it,
downgrade it, or replace it unless explicitly asked.

You may still:

- improve typing
- improve runtime config handling
- improve operability and admin UX
- add tests
- add additional provider slots

## Where streaming code belongs

Provider-specific code belongs only under:

- `server/services/streaming/`

Relevant files:

- `server/services/streaming/types.ts`
- `server/services/streaming/index.ts`
- `server/services/streaming/providers/`
- `app/(app)/admin/page.tsx`
- `app/(app)/watch/[sessionId]/page.tsx`
- `features/system/actions.ts`
- `features/system/schemas.ts`

## Current model

Each provider slot has two layers:

1. adapter metadata and playback resolution in code
2. persisted admin state in `StreamingProviderConfig`

That split lets the product keep one stable domain while deployment-specific adapters vary.

## Adding a new provider

### 1. Add the enum value

Update `StreamingProviderKey` in `prisma/schema.prisma`, then run:

```bash
npm run db:generate
npm run db:push
```

### 2. Add the adapter

Create `server/services/streaming/providers/<provider>.ts`.

The adapter should provide:

- `id`
- `key`
- `name`
- `label`
- `description`
- `isReady`
- `maturity`
- `compliance`
- `readinessNote`
- `complianceNote`
- `supportsGroupSessions`
- `supportsRealtimeSync`
- `getPlaybackSource()`

### 3. Register the adapter

Update `server/services/streaming/index.ts`:

- add the adapter to the `providers` map
- add a seed default entry in `providerSeedDefaults`
- keep the default slot disabled until the runtime is actually ready

### 4. Add runtime config

If the adapter needs env vars:

- add them in `server/env.ts`
- document them in `.env.example`
- document them in `.env.production.example` if relevant

### 5. Keep admin copy generic

Do not hardcode provider-specific marketing or compliance claims into the shared admin intro.

Provider-specific notes should come from:

- `config.notes`
- adapter `description`
- adapter `readinessNote`
- adapter `complianceNote`

### 6. Keep watch-session fallback safe

`watch-service.ts` should be able to function even when playback is unavailable.

The correct fallback is:

- watch session still exists
- checkpoints still work
- presence still works
- `groupState` explains why playback is unavailable

## Provider readiness levels

Use the existing maturity/compliance vocabulary:

- `placeholder`
- `deployment-specific`
- `do-not-enable`
- `deployment-review`

Only mark a provider ready when the runtime can actually resolve playback output.

## Plex pattern

`plex.ts` is the reference example for an env-driven provider slot:

- it becomes ready only when the runtime template exists
- it does not require hardcoded product coupling
- it returns `embed` only when it can build a deployment-valid URL

## Tests to add

At minimum:

- catalog includes the new provider
- ready/not-ready behavior is correct
- activation rules behave correctly
- playback resolution returns `embed` or `unavailable` as expected

Reference:

- `server/services/streaming/index.test.ts`

## UX expectations

When adding a provider, ensure:

- the admin card clearly shows readiness
- disabled providers cannot become active unless the adapter is ready
- watch-session UI uses provider-agnostic fallback copy
- no dead buttons or fake "ready" claims appear in the UI

## Final checklist

- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `docker compose up -d --build app`

Then update:

- `README.md`
- `docs/session-handbook.md`
- `docs/development-plan.md` if roadmap state changed
